import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import type { DocKey } from "./schema";

/*
  Storage for the admin: Postgres (Railway) when DATABASE_URL is set (production), shared with the
  public site, which reads the content table. Otherwise a gitignored JSON file so the admin can be
  built and tested locally: CMS_DEV_FILE, by default the site's own .cms-dev.json next door, so a
  local site shows local saves. Tables are created on first use, so a fresh database needs no
  migration step.

  - content: one JSON document per key (the site reads only this table)
  - content_revisions: every saved version, for History and restore. `item` names the part of a
    document the revision holds (an industry slug, a page key); without it, the whole document.
    Admin saves are "save"/"restore"/"baseline"; "code" rows record a change to the site's own
    defaults (a deploy), with the commit in `note` and a fingerprint in `hash`.
  - admin_users: editors, with session_version, which signs out every session when it changes
  - login_attempts: failed sign-ins, to slow down password guessing
*/

export type Role = "owner" | "editor";
export type AdminUser = { email: string; name: string; password_hash: string; role: Role; created_at: string; session_version: number };

export type RevisionAction = "save" | "restore" | "baseline" | "code";
export type Revision = {
  id: number;
  key: DocKey;
  item: string | null;
  data: unknown;
  action: RevisionAction;
  restored_from: number | null;
  created_by: string;
  created_at: string;
  /** For "code": the commit that changed it */
  note: string | null;
};
/**
 * `before`: the value this save replaces. When the part has no history yet it is recorded first
 * (as a "baseline"), so the very first edit can be undone too.
 */
export type RevisionInput = { item?: string | null; data: unknown; before?: unknown; action: RevisionAction; restoredFrom?: number | null };

/** Revisions kept per document part; older ones are pruned on save */
const KEEP_REVISIONS = 300;

/** Railway Postgres (its public DATABASE_PUBLIC_URL, since Vercel is outside Railway's network), or any Postgres URL. */
function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  // One connection per function instance, so serverless never piles them up. Kept open for a few
  // idle minutes: opening a new one (TLS to Railway) costs more than the query, on every click.
  return postgres(url, { max: 1, idle_timeout: 300, max_lifetime: 60 * 30, ssl: local ? false : "require" });
}

const sql = connect();
const DEV_FILE = path.resolve(/*turbopackIgnore: true*/ process.env.CMS_DEV_FILE ?? path.join(process.cwd(), "..", "website", ".cms-dev.json"));

type DevStore = {
  content: Record<string, { data: unknown; updated_at: string; updated_by: string }>;
  users: Record<string, AdminUser>;
  revisions?: Revision[];
};

let ready: Promise<unknown> | null = null;
function ensureTables() {
  if (!sql) return Promise.resolve();
  // One quick check per server instance; the schema is only created when something is missing,
  // and then in a single round trip (each one to Railway costs a noticeable delay)
  ready ??= (async () => {
    const [state] = (await sql`select to_regclass('public.login_attempts') is not null
      and exists (select 1 from information_schema.columns where table_name = 'admin_users' and column_name = 'session_version')
      and exists (select 1 from information_schema.columns where table_name = 'content_revisions' and column_name = 'hash') as ok`) as unknown as { ok: boolean }[];
    if (state?.ok) return;
    await sql.unsafe(`
      create table if not exists content (key text primary key, data jsonb not null, updated_at timestamptz not null default now(), updated_by text);
      create table if not exists admin_users (email text primary key, name text not null, password_hash text not null, role text not null default 'editor', created_at timestamptz not null default now());
      alter table admin_users add column if not exists session_version integer not null default 0;
      create table if not exists content_revisions (
        id bigserial primary key, key text not null, item text, data jsonb not null, action text not null default 'save',
        restored_from bigint, created_by text not null, created_at timestamptz not null default now());
      create index if not exists content_revisions_item on content_revisions (key, item, id desc);
      alter table content_revisions add column if not exists note text;
      alter table content_revisions add column if not exists hash text;
      create table if not exists login_attempts (id bigserial primary key, scope text not null, at timestamptz not null default now());
      create index if not exists login_attempts_scope on login_attempts (scope, at);
    `);
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

async function readDev(): Promise<DevStore> {
  try {
    return JSON.parse(await fs.readFile(DEV_FILE, "utf8")) as DevStore;
  } catch {
    return { content: {}, users: {} };
  }
}

async function writeDev(store: DevStore) {
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set: connect a database in Vercel to save from the admin.");
  await fs.writeFile(DEV_FILE, JSON.stringify(store, null, 2));
}

// The local store has no transactions: run its read-change-write steps one at a time
let devQueue: Promise<unknown> = Promise.resolve();
function devLocked<T>(run: () => Promise<T>): Promise<T> {
  const next = devQueue.then(run, run);
  devQueue = next.catch(() => undefined);
  return next;
}

/* Content documents */

/** The saved documents, or only `keys` (each screen needs one; the industries document is large) */
export async function readDocs(keys?: DocKey[]): Promise<Partial<Record<DocKey, unknown>>> {
  if (!sql) {
    const content = Object.entries((await readDev()).content).filter(([k]) => !keys || keys.includes(k as DocKey));
    return Object.fromEntries(content.map(([k, v]) => [k, v.data]));
  }
  await ensureTables();
  const rows = (keys ? await sql`select key, data from content where key in ${sql(keys)}` : await sql`select key, data from content`) as unknown as { key: DocKey; data: unknown }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.data]));
}

/**
 * Changes one document atomically. `change` gets the saved value (undefined when nothing is saved
 * yet) while the row is locked, so two editors saving at once never overwrite each other, and
 * answers with the new value and the revisions to record, or `null` to change nothing.
 * Revisions with the same item replace older ones beyond KEEP_REVISIONS.
 */
export type DocChange<T> = { data: T; revisions: RevisionInput[] };

export async function updateDoc<T>(
  key: DocKey,
  by: string,
  change: (saved: unknown) => Promise<DocChange<T> | null> | DocChange<T> | null,
): Promise<{ data: T } | null> {
  if (!sql) {
    return devLocked(async () => {
      const store = await readDev();
      const out = await change(store.content[key]?.data);
      if (!out) return null;
      const now = new Date().toISOString();
      store.content[key] = { data: out.data, updated_at: now, updated_by: by };
      let revisions = store.revisions ?? [];
      let id = revisions.reduce((m, r) => Math.max(m, r.id), 0);
      for (const r of out.revisions) {
        const item = r.item ?? null;
        if (r.before !== undefined && !revisions.some((x) => x.key === key && x.item === item && x.action !== "code")) {
          revisions.push({ id: ++id, key, item, data: r.before, action: "baseline", restored_from: null, created_by: "Before history began", created_at: now, note: null });
        }
        revisions.push({ id: ++id, key, item, data: r.data, action: r.action, restored_from: r.restoredFrom ?? null, created_by: by, created_at: now, note: null });
        const mine = revisions.filter((x) => x.key === key && x.item === item);
        if (mine.length > KEEP_REVISIONS) {
          const drop = new Set(mine.slice(0, mine.length - KEEP_REVISIONS).map((x) => x.id));
          revisions = revisions.filter((x) => !drop.has(x.id));
        }
      }
      store.revisions = revisions;
      await writeDev(store);
      return { data: out.data };
    });
  }
  await ensureTables();
  // Few round trips: each one to Railway is a noticeable wait
  return sql.begin(async (tx) => {
    // Lock the key for the rest of the transaction. Its own statement, so the read below sees
    // anything committed while this one waited.
    await tx`select pg_advisory_xact_lock(hashtext(${`content:${key}`}))`;
    const [row] = (await tx`select (select data from content where key = ${key}) as data,
      coalesce((select array_agg(distinct coalesce(item, '')) from content_revisions where key = ${key} and action <> 'code'), '{}') as items`) as unknown as { data: unknown; items: string[] }[];
    const out = await change(row?.data ?? undefined);
    if (!out) return null;
    const tracked = new Set(row?.items ?? []);
    for (const r of out.revisions) {
      const item = r.item ?? null;
      if (r.before !== undefined && !tracked.has(item ?? "")) {
        await tx`insert into content_revisions (key, item, data, action, created_by, created_at)
          values (${key}, ${item}, ${tx.json(r.before as postgres.JSONValue)}, 'baseline', 'Before history began', now() - interval '1 second')`;
      }
    }
    const [first, ...rest] = out.revisions;
    // The document, its revision and the pruning of old revisions in one statement
    if (first) {
      const item = first.item ?? null;
      await tx`with saved as (
          insert into content (key, data, updated_at, updated_by) values (${key}, ${tx.json(out.data as postgres.JSONValue)}, now(), ${by})
          on conflict (key) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by returning 1
        ), revision as (
          insert into content_revisions (key, item, data, action, restored_from, created_by)
          values (${key}, ${item}, ${tx.json(first.data as postgres.JSONValue)}, ${first.action}, ${first.restoredFrom ?? null}, ${by}) returning 1
        )
        delete from content_revisions where key = ${key} and item is not distinct from ${item} and id not in (
          select id from content_revisions where key = ${key} and item is not distinct from ${item} order by id desc limit ${KEEP_REVISIONS - 1})`;
    } else {
      await tx`insert into content (key, data, updated_at, updated_by) values (${key}, ${tx.json(out.data as postgres.JSONValue)}, now(), ${by})
        on conflict (key) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by`;
    }
    for (const r of rest) {
      await tx`insert into content_revisions (key, item, data, action, restored_from, created_by)
        values (${key}, ${r.item ?? null}, ${tx.json(r.data as postgres.JSONValue)}, ${r.action}, ${r.restoredFrom ?? null}, ${by})`;
    }
    return { data: out.data };
  }) as Promise<{ data: T } | null>;
}

/* Revisions */

export async function hasRevisions(key: DocKey, item: string | null): Promise<boolean> {
  if (!sql) return (await readDev()).revisions?.some((r) => r.key === key && r.item === item) ?? false;
  await ensureTables();
  const rows = await sql`select 1 from content_revisions where key = ${key} and item is not distinct from ${item} limit 1`;
  return rows.length > 0;
}

/** Newest first */
export async function listRevisions(key: DocKey, item: string | null, limit = 100): Promise<Revision[]> {
  if (!sql) {
    return ((await readDev()).revisions ?? [])
      .filter((r) => r.key === key && r.item === item)
      .sort((a, b) => b.id - a.id)
      .slice(0, limit);
  }
  await ensureTables();
  return (await sql`select id::int, key, item, data, action, restored_from::int, created_by, created_at, note from content_revisions
    where key = ${key} and item is not distinct from ${item} order by id desc limit ${limit}`) as unknown as Revision[];
}

export async function getRevision(id: number): Promise<Revision | null> {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  if (!sql) return (await readDev()).revisions?.find((r) => r.id === id) ?? null;
  await ensureTables();
  const rows = (await sql`select id::int, key, item, data, action, restored_from::int, created_by, created_at, note from content_revisions where id = ${id}`) as unknown as Revision[];
  return rows[0] ?? null;
}

/** The latest changes across the admin, without their data. Newest first */
export async function listActivity(limit = 150): Promise<Omit<Revision, "data">[]> {
  if (!sql) {
    return ((await readDev()).revisions ?? [])
      .filter((r) => r.action !== "baseline")
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
      .map((r) => ({ id: r.id, key: r.key, item: r.item, action: r.action, restored_from: r.restored_from, created_by: r.created_by, created_at: r.created_at, note: r.note ?? null }));
  }
  await ensureTables();
  return (await sql`select id::int, key, item, action, restored_from::int, created_by, created_at, note from content_revisions
    where action <> 'baseline' order by id desc limit ${limit}`) as unknown as Omit<Revision, "data">[];
}

/**
 * Records the site's own defaults (what the code says) for each part whose fingerprint differs
 * from the last recorded one, so changes made in code show in History next to admin saves.
 */
export async function recordCodeVersions(parts: { key: DocKey; item: string | null; data: unknown; hash: string }[], by: string, note: string) {
  if (!sql) {
    return devLocked(async () => {
      const store = await readDev();
      const revisions = (store.revisions ?? []) as (Revision & { hash?: string })[];
      let id = revisions.reduce((m, r) => Math.max(m, r.id), 0);
      const now = new Date().toISOString();
      let added = 0;
      for (const p of parts) {
        const last = [...revisions].reverse().find((r) => r.action === "code" && r.key === p.key && r.item === p.item);
        if (last?.hash === p.hash) continue;
        revisions.push({ id: ++id, key: p.key, item: p.item, data: p.data, action: "code", restored_from: null, created_by: by, created_at: now, note, hash: p.hash });
        added++;
      }
      if (!added) return;
      store.revisions = revisions;
      await writeDev(store);
    });
  }
  await ensureTables();
  await sql.begin(async (tx) => {
    // One instance at a time, so a deploy is recorded once
    await tx`select pg_advisory_xact_lock(hashtext('content:code-versions'))`;
    const rows = (await tx`select distinct on (key, item) key, coalesce(item, '') as item, hash from content_revisions
      where action = 'code' order by key, item, id desc`) as unknown as { key: string; item: string; hash: string }[];
    const last = new Map(rows.map((r) => [`${r.key}:${r.item}`, r.hash]));
    for (const p of parts) {
      if (last.get(`${p.key}:${p.item ?? ""}`) === p.hash) continue;
      await tx`insert into content_revisions (key, item, data, action, created_by, note, hash)
        values (${p.key}, ${p.item}, ${tx.json(p.data as postgres.JSONValue)}, 'code', ${by}, ${note}, ${p.hash})`;
    }
  });
}

/* Failed sign-ins */

const devAttempts = new Map<string, number[]>();

/** Failed sign-ins for each scope within the window */
export async function countFailures(scopes: string[], windowMs: number): Promise<number[]> {
  const since = Date.now() - windowMs;
  if (!sql) return scopes.map((s) => (devAttempts.get(s) ?? []).filter((t) => t > since).length);
  await ensureTables();
  const rows = (await sql`select scope, count(*)::int as n from login_attempts
    where scope in ${sql(scopes)} and at > ${new Date(since)} group by scope`) as unknown as { scope: string; n: number }[];
  return scopes.map((s) => rows.find((r) => r.scope === s)?.n ?? 0);
}

export async function recordFailure(scopes: string[]) {
  if (!sql) {
    for (const s of scopes) devAttempts.set(s, [...(devAttempts.get(s) ?? []), Date.now()]);
    return;
  }
  await ensureTables();
  for (const s of scopes) await sql`insert into login_attempts (scope) values (${s})`;
  // Keep the table small: nothing older than a day matters
  await sql`delete from login_attempts where at < now() - interval '1 day'`;
}

export async function clearFailures(scopes: string[]) {
  if (!sql) {
    for (const s of scopes) devAttempts.delete(s);
    return;
  }
  await ensureTables();
  await sql`delete from login_attempts where scope in ${sql(scopes)}`;
}

/* Admin users */

const withVersion = (u: AdminUser) => ({ ...u, session_version: u.session_version ?? 0 });

export async function getUser(email: string): Promise<AdminUser | null> {
  const key = email.trim().toLowerCase();
  if (!sql) {
    const u = (await readDev()).users[key];
    return u ? withVersion(u) : null;
  }
  await ensureTables();
  const rows = (await sql`select * from admin_users where email = ${key}`) as unknown as AdminUser[];
  return rows[0] ?? null;
}

export async function listUsers(): Promise<AdminUser[]> {
  if (!sql) return Object.values((await readDev()).users).map(withVersion).sort((a, b) => a.created_at.localeCompare(b.created_at));
  await ensureTables();
  return (await sql`select * from admin_users order by created_at`) as unknown as AdminUser[];
}

/** Creates or updates an editor. `signOut` ends every session they have (a new password, a new role). */
export async function saveUser(user: Omit<AdminUser, "created_at" | "session_version">, { signOut = false } = {}) {
  const email = user.email.trim().toLowerCase();
  if (!sql) {
    return devLocked(async () => {
      const store = await readDev();
      const old = store.users[email];
      const version = (old?.session_version ?? 0) + (old && signOut ? 1 : 0);
      store.users[email] = { ...user, email, created_at: old?.created_at ?? new Date().toISOString(), session_version: version };
      return writeDev(store);
    });
  }
  await ensureTables();
  await sql`insert into admin_users (email, name, password_hash, role) values (${email}, ${user.name}, ${user.password_hash}, ${user.role})
    on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role,
      session_version = admin_users.session_version + ${signOut ? 1 : 0}`;
}

export async function deleteUser(email: string) {
  const key = email.trim().toLowerCase();
  if (!sql) {
    return devLocked(async () => {
      const store = await readDev();
      delete store.users[key];
      return writeDev(store);
    });
  }
  await ensureTables();
  await sql`delete from admin_users where email = ${key}`;
}
