import { createHash } from "node:crypto";
import { connection } from "next/server";
import { readDocs } from "./db";
import { docSchemas, type DocKey, type Docs } from "./schema";
import { fetchDefaults } from "./site";

/** A saved document if it still validates (same rule as the site's parseDocs), else undefined */
export function parseDoc<K extends DocKey>(key: K, raw: unknown): Docs[K] | undefined {
  if (raw === undefined) return undefined;
  const parsed = docSchemas[key].safeParse(raw);
  return parsed.success ? (parsed.data as Docs[K]) : undefined;
}

/**
 * Current values for the admin forms: saved documents over the site's defaults. Pass the `keys`
 * a screen shows, so only those are read from the database; the rest are the defaults.
 */
export async function loadDocs(keys?: DocKey[]): Promise<Docs> {
  // Always per request (never prerendered): screens start this alongside the session check
  await connection();
  const [defaults, saved] = await Promise.all([fetchDefaults(), readDocs(keys)]);
  const out: Docs = { ...defaults };
  for (const key of keys ?? (Object.keys(docSchemas) as DocKey[])) {
    const doc = parseDoc(key, saved[key]);
    if (doc !== undefined) (out as Record<DocKey, unknown>)[key] = doc;
  }
  return out;
}

/**
 * A short fingerprint of a value. A form sends back the fingerprint of what it opened, and a save
 * is refused when what is stored no longer matches (someone else saved in between).
 */
export function versionOf(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("base64url").slice(0, 22);
}
