import { z } from "zod";

/*
  What the Vision Blend team can edit in the admin. These schemas validate every save, and their
  limits are the design's limits: the hero only works with a short label, a two-line tagline and
  a lead of two or three lines, so longer text is refused rather than left to break the layout.
*/

export const LIMITS = {
  eyebrow: 40,
  tagline: 30,
  lead: 160,
  projectName: 40,
  projectSub: 60,
  projectCategory: 24,
  projectDate: 20,
  projectSummary: 220,
  projectParagraph: 600,
  episodeTitle: 60,
  episodeBy: 30,
  phoneName: 20,
  location: 40,
  memberName: 40,
  memberRole: 50,
} as const;

const text = (max: number) => z.string().trim().min(1, "Required").max(max, `Keep it to ${max} characters`);
const optionalText = (max: number) => z.string().trim().max(max, `Keep it to ${max} characters`).optional().or(z.literal("").transform(() => undefined));

const instagramUrl = z
  .string()
  .trim()
  .regex(/^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+\/?$/, "Paste an Instagram post or reel link, like https://www.instagram.com/reel/ABC123/")
  .transform((u) => (u.endsWith("/") ? u : `${u}/`));

export const phoneSchema = z.object({
  name: text(LIMITS.phoneName),
  number: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{7,20}$/, "Use digits, spaces and an optional leading +, like +91 98765 43210"),
});

/** The team size isn't here: it is the number of people on the Team screen. */
export const studioSchema = z.object({
  email: z.email("Enter a valid email address"),
  emailCc: z.email("Enter a valid email address").optional().or(z.literal("").transform(() => undefined)),
  phones: z.array(phoneSchema).max(2).default([]),
  location: optionalText(LIMITS.location),
});
export type Studio = z.infer<typeof studioSchema>;

export const memberSchema = z.object({
  name: text(LIMITS.memberName),
  role: text(LIMITS.memberRole),
  /** Uploaded portrait (Vercel Blob URL); the site shows photos once every member has one */
  photo: z.url().optional(),
});
export type CmsMember = z.infer<typeof memberSchema>;

export const teamSchema = z.array(memberSchema).min(1, "Keep at least one person").max(40);

export const heroSchema = z.object({
  eyebrow: text(LIMITS.eyebrow),
  tagline: text(LIMITS.tagline)
    .transform((t) => t.replace(/\.$/, ""))
    .refine((t) => {
      const words = t.split(/\s+/).length;
      return words >= 2 && words <= 6;
    }, "Use 2 to 6 words; the last word is shown in brown"),
  lead: text(LIMITS.lead),
});
export type Hero = z.infer<typeof heroSchema>;

export const projectSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes"),
  name: text(LIMITS.projectName),
  sub: text(LIMITS.projectSub),
  category: text(LIMITS.projectCategory),
  date: text(LIMITS.projectDate),
  summary: text(LIMITS.projectSummary),
  body: z.array(text(LIMITS.projectParagraph)).max(4).optional(),
  /** Published on Instagram; false makes it a case-study slot */
  real: z.boolean(),
  featured: z.boolean(),
  instagram: z.object({ url: instagramUrl, kind: z.enum(["post", "reel"]) }).optional(),
  /** Shape of the Instagram media, so the embed can be cropped to it */
  embed: z.enum(["landscape", "portrait", "reel"]).optional(),
  /** Uploaded still (Vercel Blob URL), shown where the line drawing would be */
  cover: z.url().optional(),
});
export type CmsProject = z.infer<typeof projectSchema>;

export const projectsSchema = z
  .array(projectSchema)
  .min(1, "Keep at least one project")
  .refine((ps) => new Set(ps.map((p) => p.slug)).size === ps.length, "Two projects have the same name")
  .refine((ps) => ps.filter((p) => p.featured).length === 1, "Pick exactly one featured project")
  .refine((ps) => ps.every((p) => !p.featured || (p.real && p.instagram)), "The featured project needs an Instagram post or reel");

export const episodeSchema = z.object({
  ep: z.coerce.number().int().min(1).max(999),
  title: text(LIMITS.episodeTitle),
  date: text(LIMITS.projectDate),
  url: instagramUrl,
  by: optionalText(LIMITS.episodeBy),
});
export type CmsEpisode = z.infer<typeof episodeSchema>;

export const episodesSchema = z
  .array(episodeSchema)
  .refine((es) => new Set(es.map((e) => e.ep)).size === es.length, "Two episodes have the same number");

/*
  Industry pages and the copy on every other page. Titles may wrap one word in *stars* to show it
  in brown. Images and films are uploaded from the admin (Vercel Blob) or stay on a site path
  ("/images/…"); Drive files are stored by id, but a full Drive link is accepted and trimmed.
*/

const req = (max: number) => text(max);
const opt = (max: number) => optionalText(max);
/** Free text that may be left empty (kept as "") */
const loose = (max: number) => z.string().trim().max(max, `Keep it to ${max} characters`).default("");

/** A site path (/images/x.jpg) or an https link (Vercel Blob, ImageKit) */
const mediaUrl = z
  .string()
  .trim()
  .regex(/^(\/[^\s]*|https:\/\/[^\s]+)$/, "Upload a file, or paste an https:// link");
const optionalMedia = mediaUrl.optional().or(z.literal("").transform(() => undefined));

/** Pulls the id out of any Drive file link (/file/d/<id>/…, ?id=<id>), or takes a bare id */
export function driveId(input: string) {
  const s = input.trim();
  return s.match(/\/d\/([\w-]{10,})/)?.[1] ?? s.match(/[?&]id=([\w-]{10,})/)?.[1] ?? s;
}
const driveFile = z
  .string()
  .trim()
  .transform(driveId)
  .pipe(z.string().regex(/^[\w-]{20,}$/, "Paste the Drive file's share link"));
const driveFolder = z
  .string()
  .trim()
  .regex(/^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/[\w-]+/, "Paste a Drive folder link")
  .optional()
  .or(z.literal("").transform(() => undefined));

const ratioSchema = z.tuple([z.coerce.number().positive().max(10000), z.coerce.number().positive().max(10000)]);

export const photoSchema = z.object({
  src: mediaUrl,
  alt: z.string().trim().min(1, "Describe the image for people who can't see it").max(200, "Keep it to 200 characters"),
  /** Stock stand-in: the site tags it as a placeholder */
  placeholder: z.boolean().optional(),
});

const titleText = z.object({ title: req(60), text: req(240) });

export const offeringSchema = z.object({
  title: req(40),
  subtitle: opt(80),
  headline: opt(80),
  text: loose(400),
  image: photoSchema.optional(),
  video: optionalMedia,
  ratio: ratioSchema.optional(),
  assets: driveFolder,
});

export const workItemSchema = z.object({
  title: req(80),
  category: req(40),
  client: opt(40),
  drive: driveFile,
  kind: z.enum(["film", "still"]),
  ratio: ratioSchema,
  poster: optionalMedia,
});

export const industryDetailSchema = z.object({
  eyebrow: opt(60),
  headline: opt(80),
  lead: req(300),
  hero: photoSchema.optional(),
  introTitle: opt(80),
  paragraphs: z.array(req(800)).max(6).default([]),
  servicesTitle: opt(80),
  offerings: z.array(offeringSchema).max(16).default([]),
  value: z.object({ title: req(80), items: z.array(titleText).max(6) }).optional(),
  challenges: z.array(titleText).max(6).default([]),
  process: z.object({ title: req(60), steps: z.array(z.object({ name: req(40), text: req(240), out: opt(60) })).max(8) }).optional(),
  faqTitle: opt(80),
  faqs: z.array(z.object({ q: req(160), a: req(600) })).max(12).default([]),
  cta: z.object({ title: req(60), text: opt(240), primary: opt(30), secondary: opt(30) }).optional(),
  enquiry: z.object({ prompt: req(80), placeholder: req(200) }).optional(),
  meta: z.object({ title: req(70), description: req(170) }).optional(),
  work: z.object({ title: req(80), lead: req(240), items: z.array(workItemSchema).max(120) }).optional(),
});

export const industrySchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: req(30),
  note: opt(60),
  services: z.array(req(40)).max(10).default([]),
  summary: opt(160),
  detail: industryDetailSchema.optional(),
});
export type CmsIndustry = z.infer<typeof industrySchema>;

export const industriesSchema = z
  .array(industrySchema)
  .refine((is) => new Set(is.map((i) => i.slug)).size === is.length, "Two industries have the same address");

const sectionHead = z.object({ label: req(30), title: req(80), text: req(240) });
const meta = { metaTitle: req(70), metaDescription: req(170) };

export const pagesSchema = z.object({
  home: z.object({
    ...meta,
    showreel: z.object({
      label: req(40),
      title: req(60),
      sub: req(80),
      date: req(20),
      src: mediaUrl,
      poster: mediaUrl,
      instagram: z.url("Paste the film's Instagram link"),
      card: z.object({ left: req(30), right: req(40), place: req(60), line: req(100) }),
    }),
    work: sectionHead,
    services: sectionHead,
    beliefs: sectionHead,
    process: sectionHead,
    series: sectionHead,
    contact: sectionHead,
    /** The site's top-level beliefs and process steps (home page) */
    beliefList: z.array(z.object({ text: req(120), date: req(20), url: z.url("Paste the post's Instagram link") })).max(8),
    steps: z.array(z.object({ name: req(30), text: req(240), out: req(60) })).max(6),
  }),
  about: z.object({
    ...meta,
    title: req(100),
    lead: req(240),
    paragraphs: z.array(req(600)).max(6),
    team: z.object({ title: req(80), text: req(300) }),
    join: titleText,
  }),
  workPage: z.object({
    ...meta,
    title: req(80),
    lead: req(240),
    indexLabel: req(30),
    studioTitle: req(80),
    studioText: req(240),
    nextTitle: req(80),
    nextText: req(240),
    ctaTitle: req(80),
    ctaText: req(240),
  }),
  industriesPage: z.object({ ...meta, title: req(80), lead: req(240) }),
  contactPage: z.object({
    ...meta,
    title: req(80),
    lead: req(240),
    collaborate: req(200),
    next: z.object({ title: req(60), steps: z.array(titleText).max(5) }),
    talk: z.object({ title: req(60), text: req(240), cta: req(40) }),
    /** Link targets stay as they are in code; only the words change */
    explore: z.object({ title: req(60), links: z.array(z.object({ href: z.string().regex(/^\//), title: req(60), text: req(160) })).max(4) }),
  }),
});
export type CmsPages = z.infer<typeof pagesSchema>;
export type PageKey = keyof CmsPages;

/** One row per key in the content table. */
export const docSchemas = {
  studio: studioSchema,
  team: teamSchema,
  hero: heroSchema,
  projects: projectsSchema,
  episodes: episodesSchema,
  industries: industriesSchema,
  pages: pagesSchema,
} as const;
export type DocKey = keyof typeof docSchemas;
export type Docs = {
  studio: Studio;
  team: CmsMember[];
  hero: Hero;
  projects: CmsProject[];
  episodes: CmsEpisode[];
  industries: CmsIndustry[];
  pages: CmsPages;
};

/** "my new project" -> "my-new-project" */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-|-$/g, "");
}
