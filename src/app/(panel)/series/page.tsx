import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { PageHead } from "../../_components/nav";
import { DeleteEpisode, EpisodeForm } from "./episode-form";

export const metadata: Metadata = { title: "Series" };

export default async function SeriesAdminPage({ searchParams }: PageProps<"/series">) {
  await requireSession();
  const { edit, saved } = await searchParams;
  const { episodes } = await loadDocs();
  const editing = episodes.find((e) => String(e.ep) === edit) ?? null;
  const nextEp = Math.max(0, ...episodes.map((e) => e.ep)) + 1;

  return (
    <>
      <PageHead
        title="A Week at Vision Blend"
        text="Episodes of the reel series, newest first, on the home and Work pages. Up to four sit in a row; from five on the row scrolls sideways."
      />
      {saved && <p role="status" className="-mt-4 text-[0.92rem] text-brand">Saved. The site shows it on the next visit.</p>}

      <section className="grid gap-6 bg-paper p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="t-label marker">{editing ? `Edit episode ${editing.ep}` : "Add an episode"}</h2>
          {editing && (
            <Link href="/series" className="u text-[0.9rem]">
              Cancel
            </Link>
          )}
        </div>
        <EpisodeForm key={editing?.ep ?? "new"} episode={editing} nextEp={nextEp} />
      </section>

      <ol className="border-t border-border">
        {episodes.map((e) => (
          <li key={e.ep} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-border py-4 sm:grid-cols-[56px_minmax(0,1fr)_auto]">
            <span className="text-[0.78rem] font-medium uppercase tracking-[0.12em] text-brand">Ep {e.ep}</span>
            <div className="grid min-w-0 gap-0.5">
              <span className="truncate text-[1.05rem]">{e.title}</span>
              <span className="text-[0.86rem] text-muted-foreground">
                {[e.date, e.by && `with ${e.by}`].filter(Boolean).join(", ")} ·{" "}
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="u">
                  Reel ↗
                </a>
              </span>
            </div>
            <div className="col-start-2 flex items-center gap-2 sm:col-start-3">
              <Link href={`/series?edit=${e.ep}`} className="cta cta-line cta-sm">
                Edit
              </Link>
              <DeleteEpisode ep={e.ep} />
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
