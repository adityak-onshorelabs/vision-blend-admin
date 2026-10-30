import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { featureProject, moveProject } from "../../actions";
import { PageHead } from "../../_components/nav";

export const metadata: Metadata = { title: "Work" };

export default async function WorkAdminPage() {
  await requireSession();
  const { projects } = await loadDocs();

  return (
    <>
      <PageHead
        title="Work"
        text="Projects on the Work page and the home page, in this order. The featured project opens the Work page as its hero film."
      />
      <div className="flex justify-end">
        <Link href="/work/new" className="cta">
          Add a project <span className="arr" aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <ol className="border-t border-border">
        {projects.map((p, i) => (
          <li key={p.slug} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-border py-4 sm:grid-cols-[32px_minmax(0,1fr)_auto]">
            <span className="text-[0.78rem] font-medium tabular-nums text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>
            <div className="grid min-w-0 gap-1">
              <Link href={`/work/${p.slug}`} className="t-h3 u justify-self-start !text-[1.2rem]">
                {p.name}
              </Link>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.88rem] text-muted-foreground">
                <span>{p.category}</span>
                <span>{p.date}</span>
                {p.real ? <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-brand" />Published</span> : <span className="tbc !ms-0">Slot</span>}
                {p.featured && <span className="t-label marker !text-[0.7rem]">Featured</span>}
              </span>
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3">
              {!p.featured && p.real && p.instagram && (
                <form action={featureProject}>
                  <input type="hidden" name="slug" value={p.slug} />
                  <button type="submit" className="cta cta-line cta-sm">Make featured</button>
                </form>
              )}
              <form action={moveProject}>
                <input type="hidden" name="slug" value={p.slug} />
                <input type="hidden" name="dir" value="up" />
                <button type="submit" disabled={i === 0} aria-label={`Move ${p.name} up`} className="cta cta-line cta-sm disabled:opacity-30">↑</button>
              </form>
              <form action={moveProject}>
                <input type="hidden" name="slug" value={p.slug} />
                <input type="hidden" name="dir" value="down" />
                <button type="submit" disabled={i === projects.length - 1} aria-label={`Move ${p.name} down`} className="cta cta-line cta-sm disabled:opacity-30">↓</button>
              </form>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
