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

/** One row per key in the content table. Industries and their services come later. */
export const docSchemas = {
  studio: studioSchema,
  team: teamSchema,
  hero: heroSchema,
  projects: projectsSchema,
  episodes: episodesSchema,
} as const;
export type DocKey = keyof typeof docSchemas;
export type Docs = { studio: Studio; team: CmsMember[]; hero: Hero; projects: CmsProject[]; episodes: CmsEpisode[] };

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
