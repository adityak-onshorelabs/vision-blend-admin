"use client";

import { useState } from "react";
import { LIMITS, type CmsEpisode } from "@/lib/cms/schema";
import { deleteEpisode, saveEpisode } from "../../actions";
import { ActionForm, Field } from "../../_components/form";

export function EpisodeForm({ episode, nextEp }: { episode: CmsEpisode | null; nextEp: number }) {
  return (
    <ActionForm action={saveEpisode} submit={episode ? "Save episode" : "Add episode"}>
      <input type="hidden" name="original" value={episode?.ep ?? ""} />
      <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
        <Field name="ep" label="Episode" type="number" defaultValue={episode?.ep ?? nextEp} />
        <Field name="title" label="Title" max={LIMITS.episodeTitle} defaultValue={episode?.title} />
      </div>
      <Field name="url" label="Instagram reel link" type="url" defaultValue={episode?.url} placeholder="https://www.instagram.com/reel/…" hint="The reel's own poster frame is used as the cover" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="date" label="Date" max={LIMITS.projectDate} defaultValue={episode?.date} placeholder="6 Nov 2026" />
        <Field name="by" label="With (optional)" max={LIMITS.episodeBy} defaultValue={episode?.by} placeholder="@handle" />
      </div>
    </ActionForm>
  );
}

export function DeleteEpisode({ ep }: { ep: number }) {
  const [armed, setArmed] = useState(false);
  return (
    <form action={deleteEpisode} className="flex items-center gap-2">
      <input type="hidden" name="ep" value={ep} />
      {armed ? (
        <>
          <button type="submit" className="cta cta-sm border-[var(--error)] bg-[var(--error)]">Delete</button>
          <button type="button" className="u text-[0.86rem]" onClick={() => setArmed(false)}>Keep</button>
        </>
      ) : (
        <button type="button" className="cta cta-line cta-sm" onClick={() => setArmed(true)} aria-label={`Delete episode ${ep}`}>
          Delete
        </button>
      )}
    </form>
  );
}
