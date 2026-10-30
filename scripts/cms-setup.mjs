#!/usr/bin/env node
/*
  Creates (or resets) an admin account. Uses Postgres (Railway) when DATABASE_URL is set, otherwise the local
  development store (CMS_DEV_FILE, by default ../website/.cms-dev.json), the same way the app does.

    node --env-file=.env.local scripts/cms-setup.mjs --email you@onshorelabs.co.in --name "Your Name" [--role owner|editor]

  The password is read from CMS_PASSWORD, or asked for interactively, so it stays out of shell history.
*/
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, a, i, all) => (a.startsWith("--") ? [...pairs, [a.slice(2), all[i + 1]]] : pairs), []),
);

const email = String(args.email ?? "").trim().toLowerCase();
const name = String(args.name ?? "").trim();
const role = args.role === "editor" ? "editor" : "owner";
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
  console.error('Usage: node --env-file=.env.local scripts/cms-setup.mjs --email you@example.com --name "Your Name" [--role owner|editor]');
  process.exit(1);
}

let password = process.env.CMS_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Password (10+ characters): ");
  rl.close();
}
if (!password || password.length < 10) {
  console.error("The password needs at least 10 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = await scrypt(password, salt, 64);
const passwordHash = `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;

if (process.env.DATABASE_URL) {
  const { default: postgres } = await import("postgres");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL);
  const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: local ? false : "require" });
  await sql`create table if not exists content (key text primary key, data jsonb not null, updated_at timestamptz not null default now(), updated_by text)`;
  await sql`create table if not exists admin_users (email text primary key, name text not null, password_hash text not null, role text not null default 'editor', created_at timestamptz not null default now())`;
  await sql`insert into admin_users (email, name, password_hash, role) values (${email}, ${name}, ${passwordHash}, ${role})
    on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash, role = excluded.role`;
  await sql.end();
  console.log(`Saved ${role} ${email} in the database.`);
} else {
  const file = path.resolve(process.env.CMS_DEV_FILE ?? path.join(process.cwd(), "..", "website", ".cms-dev.json"));
  let store = { content: {}, users: {} };
  try {
    store = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {}
  store.users[email] = { email, name, password_hash: passwordHash, role, created_at: store.users[email]?.created_at ?? new Date().toISOString() };
  await fs.writeFile(file, JSON.stringify(store, null, 2));
  console.log(`Saved ${role} ${email} in ${file} (no DATABASE_URL, local development only).`);
}
