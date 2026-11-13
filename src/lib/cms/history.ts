import type { DocKey } from "./schema";

/*
  What changed between two versions, in words an editor reads: "FAQs › 3 › Answer", with the
  old and new text. Used by the History screens.
*/

export type Change = { path: string; section: string; before: string; after: string };

const LABELS: Record<string, string> = {
  detail: "",
  hero: "Hero",
  eyebrow: "Small line above the title",
  headline: "Title",
  lead: "Intro line",
  tagline: "Tagline",
  name: "Name",
  note: "Note",
  summary: "Summary",
  services: "Services",
  introTitle: "Introduction title",
  paragraphs: "Paragraphs",
  servicesTitle: "What we make title",
  offerings: "Showcase cards",
  title: "Title",
  subtitle: "Subtitle",
  text: "Text",
  video: "Film",
  image: "Poster",
  src: "Image",
  alt: "Alt text",
  instagram: "Instagram link",
  ratio: "Frame",
  assets: "Drive folder",
  value: "What the work is designed to do",
  items: "Items",
  challenges: "Challenges",
  process: "Process",
  steps: "Steps",
  out: "What you get",
  faqTitle: "FAQs title",
  faqs: "FAQs",
  q: "Question",
  a: "Answer",
  cta: "Closing section",
  primary: "Main button",
  secondary: "Second button",
  enquiry: "Contact form prompt",
  prompt: "Question",
  placeholder: "Hint",
  meta: "Search listing",
  description: "Description",
  work: "Portfolio",
  drive: "Drive file",
  category: "Category",
  client: "Client",
  kind: "Type",
  poster: "Cover",
  clients: "Client logos",
  logos: "Logos",
  logo: "Logo",
  scale: "Size",
};

/** Industry fields by the editor section they sit in */
const INDUSTRY_SECTIONS: [string, string[]][] = [
  ["Hero", ["detail.hero", "detail.eyebrow", "detail.headline", "detail.lead"]],
  ["Industries page card", ["name", "note", "summary", "services"]],
  ["Introduction", ["detail.introTitle", "detail.paragraphs"]],
  ["What we make", ["detail.servicesTitle", "detail.offerings"]],
  ["Why it works", ["detail.value", "detail.challenges"]],
  ["Process", ["detail.process"]],
  ["FAQs", ["detail.faqTitle", "detail.faqs"]],
  ["Closing and enquiry", ["detail.cta", "detail.enquiry"]],
  ["Search and sharing", ["detail.meta"]],
  ["Portfolio", ["detail.work"]],
  ["Client logos", ["detail.clients"]],
];

const humanize = (k: string) => LABELS[k] ?? k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

function label(path: (string | number)[]) {
  return path
    .map((k) => (typeof k === "number" ? String(k + 1) : humanize(k)))
    .filter(Boolean)
    .join(" › ");
}

function sectionOf(key: DocKey, path: (string | number)[]) {
  if (key !== "industries") return humanize(String(path[0] ?? "")) || "Whole document";
  const p = path.join(".");
  return INDUSTRY_SECTIONS.find(([, prefixes]) => prefixes.some((x) => p === x || p.startsWith(`${x}.`)))?.[0] ?? "Other";
}

function show(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (typeof v === "string") return v.length > 220 ? `${v.slice(0, 220)}…` : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.length === 0 ? "—" : `${v.length} item${v.length === 1 ? "" : "s"}`;
  return "Set";
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isLeafArray = (v: unknown) => Array.isArray(v) && v.every((x) => !isObj(x) && !Array.isArray(x));

/** Changed fields from `before` to `after`, deepest first-level differences, at most `limit` */
export function diff(key: DocKey, before: unknown, after: unknown, limit = 40): { changes: Change[]; more: number } {
  const out: Change[] = [];
  let more = 0;
  const walk = (a: unknown, b: unknown, path: (string | number)[]) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const push = (x: unknown, y: unknown, p: (string | number)[]) => {
      if (out.length >= limit) {
        more++;
        return;
      }
      out.push({ path: label(p) || "Whole document", section: sectionOf(key, p), before: show(x), after: show(y) });
    };
    // Ratios ([16, 9]) and lists of plain strings read best as one value
    if (isLeafArray(a) && isLeafArray(b) && path.at(-1) === "ratio") return push((a as number[]).join(":"), (b as number[]).join(":"), path);
    if (isLeafArray(a) || isLeafArray(b)) {
      const xs = (a as unknown[]) ?? [];
      const ys = (b as unknown[]) ?? [];
      for (let i = 0; i < Math.max(xs.length, ys.length); i++) if (JSON.stringify(xs[i]) !== JSON.stringify(ys[i])) push(xs[i], ys[i], [...path, i]);
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (i >= a.length) push(undefined, "Added", [...path, i]);
        else if (i >= b.length) push("Removed", undefined, [...path, i]);
        else walk(a[i], b[i], [...path, i]);
      }
      return;
    }
    if (isObj(a) && isObj(b)) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[k], b[k], [...path, k]);
      return;
    }
    if (isObj(a) || isObj(b) || Array.isArray(a) || Array.isArray(b)) {
      return push(a === undefined ? undefined : isObj(a) || Array.isArray(a) ? "Set" : a, b === undefined ? "Removed" : isObj(b) || Array.isArray(b) ? "Added" : b, path);
    }
    push(a, b, path);
  };
  walk(before, after, []);
  return { changes: out, more };
}

/** The sections a change touched, in order, without repeats */
export const sectionsOf = (changes: Change[]) => [...new Set(changes.map((c) => c.section))];

export const DOC_LABELS: Record<DocKey, string> = {
  hero: "Hero",
  studio: "Studio details",
  projects: "Work projects",
  episodes: "Series",
  team: "Team",
  industries: "Industry",
  pages: "Page",
};

const IST = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
export const when = (iso: string | Date) => IST.format(new Date(iso));

/** Where a document part's History lives */
export function historyPath(key: DocKey, item: string | null) {
  if (key === "industries" && item) return `/industries/${item}/history`;
  if (key === "pages" && item) return `/pages/${item}/history`;
  return `/activity?doc=${key}`;
}
