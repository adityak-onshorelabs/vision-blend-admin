import type { Docs } from "./schema";

/*
  The public site is a separate deployment. It owns the default content (src/content/en.ts) and
  its cache, so the admin asks it for the defaults and tells it to refresh after every save, both
  through /api/cms with the shared CMS_SECRET.
*/

function endpoint() {
  const site = process.env.SITE_URL;
  const secret = process.env.CMS_SECRET;
  if (!site || !secret) throw new Error("SITE_URL and CMS_SECRET must be set to reach the public site.");
  return { url: `${site.replace(/\/$/, "")}/api/cms`, headers: { authorization: `Bearer ${secret}` } };
}

/** The values in the site's code, used where nothing has been saved yet. */
export async function fetchDefaults(): Promise<Docs> {
  const { url, headers } = endpoint();
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`The public site answered ${res.status} when asked for its content.`);
  return (await res.json()) as Docs;
}

/** Makes the public site show the saved values on its next request. */
export async function refreshSite() {
  const { url, headers } = endpoint();
  const res = await fetch(url, { method: "POST", headers, cache: "no-store" });
  if (!res.ok) throw new Error(`Saved, but the public site answered ${res.status} when asked to refresh.`);
}

/** Link to the public site, for "View site". */
export function siteUrl(path = "/en") {
  return `${(process.env.SITE_URL ?? "").replace(/\/$/, "")}${path}`;
}
