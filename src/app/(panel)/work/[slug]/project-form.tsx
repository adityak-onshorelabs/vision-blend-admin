"use client";

import { useState } from "react";
import { LIMITS, type CmsProject } from "@/lib/cms/schema";
import { deleteProject, saveProject } from "../../../actions";
import { ActionForm, Check, Field, FieldError, Select } from "../../../_components/form";

export function ProjectForm({ project }: { project: CmsProject | null }) {
  const [url, setUrl] = useState(project?.instagram?.url ?? "");
  const isReel = url.includes("/reel/");

  return (
    <div className="grid gap-12">
      <ActionForm action={saveProject} submit={project ? "Save project" : "Add project"}>
        <input type="hidden" name="original" value={project?.slug ?? ""} />
        <section className="grid gap-5">
          <h2 className="t-label marker">The project</h2>
          <Field name="name" label="Name" max={LIMITS.projectName} defaultValue={project?.name} />
          <Field name="sub" label="Subtitle" max={LIMITS.projectSub} defaultValue={project?.sub} hint="e.g. Production Files 003, or the client's name" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field name="category" label="Type" max={LIMITS.projectCategory} defaultValue={project?.category} hint="Film, Branding, Content, Studio…" />
            <Field name="date" label="Date" max={LIMITS.projectDate} defaultValue={project?.date} placeholder="Nov 2026" />
          </div>
          <Field name="summary" label="Summary" max={LIMITS.projectSummary} multiline rows={3} defaultValue={project?.summary} hint="One or two sentences, shown in lists and previews" />
          <Field
            name="body"
            label="Story (optional)"
            multiline
            rows={6}
            defaultValue={project?.body?.join("\n\n")}
            hint={`Up to 4 paragraphs, separated by an empty line, ${LIMITS.projectParagraph} characters each. Shown when this is the featured project.`}
          />
        </section>

        <section className="grid gap-5">
          <h2 className="t-label marker">Instagram</h2>
          <Check name="real" label="Published on Instagram" defaultChecked={project?.real ?? true} hint="Untick to show it as a case-study slot" />
          <Field name="instagram" label="Post or reel link" type="url" defaultValue={url} onValue={setUrl} placeholder="https://www.instagram.com/p/…" />
          {url && !isReel && (
            <Select
              name="embed"
              label="Post shape"
              defaultValue={project?.embed === "portrait" ? "portrait" : "landscape"}
              options={[
                ["landscape", "Landscape (16:9 film)"],
                ["portrait", "Portrait (4:5 post)"],
              ]}
              hint="So the post is cropped to its own shape on the site"
            />
          )}
          {isReel && <p className="text-[0.88rem] text-muted-foreground">Reel detected: shown in its tall 9:16 shape.</p>}
        </section>

        <section className="grid gap-4">
          <h2 className="t-label marker">Cover image (optional)</h2>
          {project?.cover && (
            <div className="grid gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file */}
              <img src={project.cover} alt="" className="aspect-[4/3] w-full max-w-[320px] object-cover" />
              <Check name="removeCover" label="Remove this image" />
            </div>
          )}
          <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" className="text-[0.92rem] file:me-4 file:cursor-pointer file:border file:border-ink file:bg-transparent file:px-4 file:py-2 file:text-[0.88rem]" />
          <FieldError name="cover" />
          <p className="text-[0.84rem] text-muted-foreground">A still from the project, shown where the line drawing is today. JPG, PNG or WebP, under 4 MB.</p>
        </section>
      </ActionForm>

      {project && <DeleteProject slug={project.slug} featured={project.featured} />}
    </div>
  );
}

function DeleteProject({ slug, featured }: { slug: string; featured: boolean }) {
  const [armed, setArmed] = useState(false);
  if (featured) return <p className="text-[0.88rem] text-muted-foreground">This is the featured project. Feature another one before deleting it.</p>;
  return (
    <form action={deleteProject} className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
      <input type="hidden" name="slug" value={slug} />
      {armed ? (
        <>
          <button type="submit" className="cta border-[var(--error)] bg-[var(--error)]">Delete for good</button>
          <button type="button" className="u text-[0.92rem]" onClick={() => setArmed(false)}>Keep it</button>
        </>
      ) : (
        <button type="button" className="cta cta-line" onClick={() => setArmed(true)}>Delete this project</button>
      )}
    </form>
  );
}
