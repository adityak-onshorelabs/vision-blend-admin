"use server";

import { put } from "@vercel/blob";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { endSession, hashPassword, requireSession, startSession, verifyPassword } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { deleteUser, getUser, listUsers, saveUser, writeDoc, type Role } from "@/lib/cms/db";
import { docSchemas, episodeSchema, heroSchema, industrySchema, memberSchema, pagesSchema, projectSchema, slugify, studioSchema, type CmsMember, type CmsProject, type DocKey, type PageKey } from "@/lib/cms/schema";
import { refreshSite } from "@/lib/cms/site";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> };

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

function errorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

/** Validate a whole document, save it and refresh the public site. */
async function commit(key: DocKey, data: unknown, by: string): Promise<FormState> {
  const parsed = docSchemas[key].safeParse(data);
  if (!parsed.success) return { errors: errorsOf(parsed.error), message: parsed.error.issues[0]?.message };
  try {
    await writeDoc(key, parsed.data, by);
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Could not save. Try again." };
  }
  try {
    await refreshSite();
  } catch (err) {
    return { ok: true, message: err instanceof Error ? err.message : "Saved, but the site could not be refreshed." };
  }
  return { ok: true, message: "Saved. The site shows it on the next visit." };
}

/* Login */

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser(str(fd, "email"));
  if (!user || !(await verifyPassword(str(fd, "password"), user.password_hash))) {
    return { message: "That email and password don't match an editor account." };
  }
  await startSession({ email: user.email, name: user.name, role: user.role });
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

/* Studio and hero */

export async function saveStudio(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  // Two phone slots; a slot left empty is dropped, a half-filled one is an error on that field
  const phones = [0, 1]
    .map((i) => ({ name: str(fd, `phones.${i}.name`).trim(), number: str(fd, `phones.${i}.number`).trim() }))
    .filter((p) => p.name || p.number);
  const parsed = studioSchema.safeParse({ email: str(fd, "email"), emailCc: str(fd, "emailCc"), phones, location: str(fd, "location") });
  if (!parsed.success) return { errors: errorsOf(parsed.error) };
  return commit("studio", parsed.data, s.email);
}

export async function saveHero(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const parsed = heroSchema.safeParse({ eyebrow: str(fd, "eyebrow"), tagline: str(fd, "tagline"), lead: str(fd, "lead") });
  if (!parsed.success) return { errors: errorsOf(parsed.error) };
  return commit("hero", parsed.data, s.email);
}

/* Work projects */

/** Uploads an image to Vercel Blob under folder/slug-timestamp.ext and returns its public URL. */
async function uploadImage(file: File, folder: string, slug: string) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${folder}/${slug}-${Date.now()}.${ext}`;
  // The site is another deployment, so covers always go to Vercel Blob, even in development
  // Newer stores connect with BLOB_STORE_ID (signed in through Vercel OIDC), older ones with a token
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Image uploads need a Vercel Blob store: connect a public one to the project.");
  const blob = await put(name, file, { access: "public", contentType: file.type });
  return blob.url;
}

export async function saveProject(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const { projects } = await loadDocs();
  const original = str(fd, "original");
  const name = str(fd, "name").trim();
  const slug = original || slugify(name);
  const existing = projects.find((p) => p.slug === original);

  const url = str(fd, "instagram").trim();
  const body = str(fd, "body")
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  let cover = fd.get("removeCover") ? undefined : existing?.cover;
  const file = fd.get("cover");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { errors: { cover: "Upload an image (JPG, PNG or WebP)" } };
    if (file.size > 4 * 1024 * 1024) return { errors: { cover: "Keep the image under 4 MB" } };
    try {
      cover = await uploadImage(file, "work", slug || "project");
    } catch (err) {
      return { errors: { cover: err instanceof Error ? err.message : "Upload failed" } };
    }
  }

  const candidate = {
    slug,
    name,
    sub: str(fd, "sub"),
    category: str(fd, "category"),
    date: str(fd, "date"),
    summary: str(fd, "summary"),
    body: body.length ? body : undefined,
    real: fd.get("real") === "on",
    featured: existing?.featured ?? false,
    instagram: url ? { url, kind: url.includes("/reel/") ? ("reel" as const) : ("post" as const) } : undefined,
    embed: url ? ((url.includes("/reel/") ? "reel" : str(fd, "embed") || "landscape") as CmsProject["embed"]) : undefined,
    cover,
  };
  if (candidate.real && !candidate.instagram) return { errors: { instagram: "A published project needs its Instagram post or reel link" } };

  const parsed = projectSchema.safeParse(candidate);
  if (!parsed.success) return { errors: errorsOf(parsed.error) };
  if (!original && projects.some((p) => p.slug === slug)) return { errors: { name: "A project with this name already exists" } };

  const next = original ? projects.map((p) => (p.slug === original ? parsed.data : p)) : [...projects, parsed.data];
  const result = await commit("projects", next, s.email);
  if (result.ok && !original) redirect(`/work/${slug}?saved=1`);
  return result;
}

async function updateProjects(change: (ps: CmsProject[]) => CmsProject[]) {
  const s = await requireSession();
  const { projects } = await loadDocs();
  const result = await commit("projects", change(projects), s.email);
  if (!result.ok) throw new Error(result.message ?? "Could not save");
}

export async function moveProject(fd: FormData) {
  const slug = str(fd, "slug");
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  await updateProjects((ps) => {
    const i = ps.findIndex((p) => p.slug === slug);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ps.length) return ps;
    const next = [...ps];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
}

export async function featureProject(fd: FormData) {
  const slug = str(fd, "slug");
  await updateProjects((ps) => ps.map((p) => ({ ...p, featured: p.slug === slug })));
}

export async function deleteProject(fd: FormData) {
  const slug = str(fd, "slug");
  await updateProjects((ps) => ps.filter((p) => p.slug !== slug));
  redirect("/work");
}

/* Team */

export async function saveMember(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const { team } = await loadDocs();
  // Members are addressed by position; "original" is empty when adding
  const original = str(fd, "original");
  const index = original === "" ? -1 : Number(original);
  const existing = index >= 0 ? team[index] : undefined;
  if (index >= 0 && !existing) return { message: "This person was changed elsewhere. Reload the page and try again." };

  const name = str(fd, "name").trim();
  let photo = fd.get("removePhoto") ? undefined : existing?.photo;
  const file = fd.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { errors: { photo: "Upload an image (JPG, PNG or WebP)" } };
    if (file.size > 4 * 1024 * 1024) return { errors: { photo: "Keep the image under 4 MB" } };
    try {
      photo = await uploadImage(file, "team", slugify(name) || "member");
    } catch (err) {
      return { errors: { photo: err instanceof Error ? err.message : "Upload failed" } };
    }
  }

  const parsed = memberSchema.safeParse({ name, role: str(fd, "role"), photo });
  if (!parsed.success) return { errors: errorsOf(parsed.error) };
  if (team.some((m, i) => i !== index && m.name.toLowerCase() === parsed.data.name.toLowerCase())) return { errors: { name: "This person is already in the team" } };

  const next = index >= 0 ? team.map((m, i) => (i === index ? parsed.data : m)) : [...team, parsed.data];
  const result = await commit("team", next, s.email);
  if (result.ok) redirect("/team?saved=1");
  return result;
}

async function updateTeam(change: (ms: CmsMember[]) => CmsMember[]) {
  const s = await requireSession();
  const { team } = await loadDocs();
  const result = await commit("team", change(team), s.email);
  if (!result.ok) throw new Error(result.message ?? "Could not save");
}

export async function moveMember(fd: FormData) {
  const i = Number(str(fd, "index"));
  const j = i + (str(fd, "dir") === "up" ? -1 : 1);
  await updateTeam((ms) => {
    if (!ms[i] || !ms[j]) return ms;
    const next = [...ms];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
}

export async function deleteMember(fd: FormData) {
  const i = Number(str(fd, "index"));
  await updateTeam((ms) => ms.filter((_, k) => k !== i));
}

/* Series episodes */

export async function saveEpisode(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const { episodes } = await loadDocs();
  const original = Number(str(fd, "original")) || 0;
  const parsed = episodeSchema.safeParse({ ep: str(fd, "ep"), title: str(fd, "title"), date: str(fd, "date"), url: str(fd, "url"), by: str(fd, "by") });
  if (!parsed.success) return { errors: errorsOf(parsed.error) };
  if (parsed.data.ep !== original && episodes.some((e) => e.ep === parsed.data.ep)) return { errors: { ep: `Episode ${parsed.data.ep} already exists` } };
  const next = (original ? episodes.map((e) => (e.ep === original ? parsed.data : e)) : [...episodes, parsed.data]).sort((a, b) => b.ep - a.ep);
  const result = await commit("episodes", next, s.email);
  if (result.ok) redirect("/series?saved=1");
  return result;
}

export async function deleteEpisode(fd: FormData) {
  const s = await requireSession();
  const { episodes } = await loadDocs();
  const ep = Number(str(fd, "ep"));
  const result = await commit("episodes", episodes.filter((e) => e.ep !== ep), s.email);
  if (!result.ok) throw new Error(result.message ?? "Could not save");
}

/* Industry pages and page copy (the document editor sends the whole record as JSON) */

function json(fd: FormData): unknown {
  try {
    return JSON.parse(str(fd, "data"));
  } catch {
    return null;
  }
}

export async function saveIndustry(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const parsed = industrySchema.safeParse(json(fd));
  if (!parsed.success) return { errors: errorsOf(parsed.error), message: "Some fields need a fix. They are marked below." };
  if (parsed.data.slug !== slug) return { message: "This industry was changed elsewhere. Reload the page and try again." };
  const { industries } = await loadDocs();
  if (!industries.some((i) => i.slug === slug)) return { message: "This industry no longer exists on the site." };
  return commit("industries", industries.map((i) => (i.slug === slug ? parsed.data : i)), s.email);
}

export async function savePage(page: PageKey, _: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const parsed = pagesSchema.shape[page].safeParse(json(fd));
  if (!parsed.success) return { errors: errorsOf(parsed.error), message: "Some fields need a fix. They are marked below." };
  const { pages } = await loadDocs();
  return commit("pages", { ...pages, [page]: parsed.data }, s.email);
}

export type Upload = { url?: string; error?: string };

const VIDEO_TYPES = ["video/mp4", "video/webm"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Uploads one image or film as soon as it is picked, so a save only sends text. Server Action
 * bodies are capped at 4.5 MB on Vercel; bigger films go to ImageKit (or a Blob link) and are pasted.
 */
export async function uploadMedia(fd: FormData): Promise<Upload> {
  await requireSession();
  const file = fd.get("file");
  const kind = str(fd, "kind") === "video" ? "video" : "image";
  const folder = slugify(str(fd, "folder")) || "media";
  if (!(file instanceof File) || file.size === 0) return { error: "Pick a file to upload" };
  if (kind === "image" && !IMAGE_TYPES.includes(file.type)) return { error: "Upload a JPG, PNG, WebP or AVIF image" };
  if (kind === "video" && !VIDEO_TYPES.includes(file.type)) return { error: "Upload an MP4 (H.264) or WebM film" };
  if (file.size > 4.4 * 1024 * 1024) return { error: kind === "video" ? "Films over 4.4 MB can't be uploaded here: upload it to ImageKit and paste its link instead" : "Keep the image under 4.4 MB" };
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || kind;
  try {
    return { url: await uploadImage(file, folder, base) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

/* Editors (owner only) */

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireSession("owner");
  const email = str(fd, "email").trim().toLowerCase();
  const name = str(fd, "name").trim();
  const password = str(fd, "password");
  const role: Role = str(fd, "role") === "owner" ? "owner" : "editor";
  const errors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
  if (!name) errors.name = "Add their name";
  if (password.length < 10) errors.password = "Use at least 10 characters";
  if (Object.keys(errors).length) return { errors };
  if (await getUser(email)) return { errors: { email: "This person already has an account" } };
  try {
    await saveUser({ email, name, role, password_hash: await hashPassword(password) });
  } catch (err) {
    return { message: err instanceof Error ? err.message : "Could not save. Try again." };
  }
  return { ok: true, message: `${name} can now sign in to the admin with that email and password.` };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const user = await getUser(s.email);
  const next = str(fd, "newPassword");
  if (!user || !(await verifyPassword(str(fd, "current"), user.password_hash))) return { errors: { current: "Your current password is not right" } };
  if (next.length < 10) return { errors: { newPassword: "Use at least 10 characters" } };
  await saveUser({ ...user, password_hash: await hashPassword(next) });
  return { ok: true, message: "Password changed." };
}

export async function removeUser(fd: FormData) {
  const s = await requireSession("owner");
  const email = str(fd, "email");
  if (email === s.email) return;
  const owners = (await listUsers()).filter((u) => u.role === "owner");
  if (owners.length === 1 && owners[0].email === email) return;
  await deleteUser(email);
}
