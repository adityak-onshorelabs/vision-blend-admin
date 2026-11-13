import { versionOf } from "./admin-data";
import { recordCodeVersions } from "./db";
import { docSchemas, industrySchema, pagesSchema, type DocKey, type Docs, type PageKey } from "./schema";
import type { Build } from "./site";

/*
  Changes made in the site's code (src/content on a deploy) show in History next to admin saves.
  Each time the admin fetches the site's defaults it fingerprints every part (each industry, each
  page's copy, and the hero, studio, work, series and team) and records the ones that changed
  since the last recorded code version, with the deploy's commit and author.

  Note: a part saved in the admin is shown from the admin's version, field by field, so a later
  code change to those fields is recorded here but does not reach the live site until restored.
*/

type Part = { key: DocKey; item: string | null; data: unknown; hash: string };

const WHOLE: DocKey[] = ["hero", "studio", "projects", "episodes", "team", "focus"];

function parts(docs: Docs): Part[] {
  const out: Part[] = [];
  const add = (key: DocKey, item: string | null, schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } }, raw: unknown) => {
    const parsed = schema.safeParse(raw);
    if (parsed.success) out.push({ key, item, data: parsed.data, hash: versionOf(parsed.data) });
  };
  for (const industry of docs.industries ?? []) add("industries", industry.slug, industrySchema, industry);
  for (const page of Object.keys(pagesSchema.shape) as PageKey[]) add("pages", page, pagesSchema.shape[page], docs.pages?.[page]);
  for (const key of WHOLE) add(key, null, docSchemas[key], docs[key]);
  return out;
}

export async function recordCodeChanges(docs: Docs, build: Build) {
  const sha = build.sha.slice(0, 7);
  const note = build.message ? `${build.message}${sha ? ` (${sha})` : ""}` : sha ? `Deploy ${sha}` : "Site code";
  await recordCodeVersions(parts(docs), build.author || "Site code", note);
}
