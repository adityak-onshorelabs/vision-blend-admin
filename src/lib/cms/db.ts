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
*/

export type Role = "owner" | "editor";
export type AdminUser = { email: string; name: string; password_hash: string; role: Role; created_at: string };

/** Railway Postgres (its public DATABASE_PUBLIC_URL, since Vercel is outside Railway's network), or any Postgres URL. */
function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  // One connection per function instance, closed when idle, so serverless never piles them up
  return postgres(url, { max: 1, idle_timeout: 20, ssl: local ? false : "require" });
}

const sql = connect();
const DEV_FILE = path.resolve(/*turbopackIgnore: true*/ process.env.CMS_DEV_FILE ?? path.join(process.cwd(), "..", "website", ".cms-dev.json"));

type DevStore = { content: Record<string, { data: unknown; updated_at: string; updated_by: string }>; users: Record<string, AdminUser> };

let ready: Promise<unknown> | null = null;
function ensureTables() {
  if (!sql) return Promise.resolve();
  ready ??= Promise.all([
    sql`create table if not exists content (key text primary key, data jsonb not null, updated_at timestamptz not null default now(), updated_by text)`,
    sql`create table if not exists admin_users (email text primary key, name text not null, password_hash text not null, role text not null default 'editor', created_at timestamptz not null default now())`,
  ]);
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

/* Content documents */

export async function readDocs(): Promise<Partial<Record<DocKey, unknown>>> {
  if (!sql) return Object.fromEntries(Object.entries((await readDev()).content).map(([k, v]) => [k, v.data]));
  await ensureTables();
  const rows = (await sql`select key, data from content`) as unknown as { key: DocKey; data: unknown }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.data]));
}

export async function writeDoc(key: DocKey, data: unknown, by: string) {
  if (!sql) {
    const store = await readDev();
    store.content[key] = { data, updated_at: new Date().toISOString(), updated_by: by };
    return writeDev(store);
  }
  await ensureTables();
  await sql`insert into content (key, data, updated_at, updated_by) values (${key}, ${JSON.stringify(data)}::jsonb, now(), ${by})
    on conflict (key) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by`;
}

/* Admin users */

export async function getUser(email: string): Promise<AdminUser | null> {
  const key = email.trim().toLowerCase();
  if (!sql) return (await readDev()).users[key] ?? null;
  await ensureTables();
  const rows = (await sql`select * from admin_users where email = ${key}`) as unknown as AdminUser[];
  return rows[0] ?? null;
}

export async function listUsers(): Promise<AdminUser[]> {
  if (!sql) return Object.values((await readDev()).users).sort((a, b) => a.created_at.localeCompare(b.created_at));
  await ensureTables();
  return (await sql`select * from admin_users order by created_at`) as unknown as AdminUser[];
}

export async function saveUser(user: Omit<AdminUser, "created_at">) {
  const email = user.email.trim().toLowerCase();
  if (!sql) {
    const store = await readDev();
    store.users[email] = { ...user, email, created_at: store.users[email]?.created_at ?? new Date().toISOString() };
    return writeDev(store);
  }
  await ensureTables();
  await sql`insert into admin_users (email, name, password_hash, role) values (${email}, ${user.name}, ${user.password_hash}, ${user.role})
    on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role`;
}

export async function deleteUser(email: string) {
  const key = email.trim().toLowerCase();
  if (!sql) {
    const store = await readDev();
    delete store.users[key];
    return writeDev(store);
  }
  await ensureTables();
  await sql`delete from admin_users where email = ${key}`;
}
