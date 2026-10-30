import { readDocs } from "./db";
import { docSchemas, type DocKey, type Docs } from "./schema";
import { fetchDefaults } from "./site";

/** Keeps only the saved documents that still validate (same rule as the site's parseDocs). */
function parseDocs(raw: Partial<Record<DocKey, unknown>>): Partial<Docs> {
  const out: Partial<Record<DocKey, unknown>> = {};
  for (const key of Object.keys(docSchemas) as DocKey[]) {
    if (raw[key] === undefined) continue;
    const parsed = docSchemas[key].safeParse(raw[key]);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as Partial<Docs>;
}

/** Current values for the admin forms: saved documents over the site's defaults (uncached). */
export async function loadDocs(): Promise<Docs> {
  const [defaults, saved] = await Promise.all([fetchDefaults(), readDocs()]);
  return { ...defaults, ...parseDocs(saved) };
}
