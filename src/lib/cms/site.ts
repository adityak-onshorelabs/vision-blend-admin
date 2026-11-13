import { after } from "next/server";
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

/** The site deploy the defaults came from (Vercel's git details; empty locally) */
export type Build = { sha: string; message: string; author: string };

function readBuild(res: Response): Build {
  try {
    const raw = JSON.parse(decodeURIComponent(res.headers.get("x-cms-build") ?? "")) as Partial<Build>;
    return { sha: String(raw.sha ?? ""), message: String(raw.message ?? ""), author: String(raw.author ?? "") };
  } catch {
    return { sha: "", message: "", author: "" };
  }
}

// The defaults only change when the site is redeployed, so each server instance keeps them for a
// few minutes instead of asking the site on every page and every save
const DEFAULTS_TTL_MS = 5 * 60 * 1000;
let defaults: { at: number; value: Promise<Docs> } | null = null;

/** The values in the site's code, used where nothing has been saved yet. */
export function fetchDefaults(): Promise<Docs> {
  if (defaults && Date.now() - defaults.at < DEFAULTS_TTL_MS) return defaults.value;
  const fetched = (async () => {
    const { url, headers } = endpoint();
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`The public site answered ${res.status} when asked for its content.`);
    return { docs: (await res.json()) as Docs, build: readBuild(res) };
  })();
  const value = fetched.then((f) => f.docs);
  defaults = { at: Date.now(), value };
  value.catch(() => {
    if (defaults?.value === value) defaults = null;
  });
  // A fresh copy may hold a code change: record it in History once the response is sent
  try {
    after(async () => {
      try {
        const { docs, build } = await fetched;
        const { recordCodeChanges } = await import("./code-history");
        await recordCodeChanges(docs, build);
      } catch (err) {
        console.error("[admin] could not record code changes", err);
      }
    });
  } catch {
    // Outside a request (nothing to attach to): the next fresh copy records it
  }
  return value;
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
