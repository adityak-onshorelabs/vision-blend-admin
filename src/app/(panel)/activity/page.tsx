import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { listActivity } from "@/lib/cms/db";
import { DOC_LABELS, historyPath, when } from "@/lib/cms/history";
import { docSchemas, type DocKey } from "@/lib/cms/schema";
import { HistoryList, namesByEmail, RestoredNote } from "../../_components/history";
import { PageHead } from "../../_components/nav";
import { PAGES } from "../pages/pages";

export const metadata: Metadata = { title: "History" };

/** The documents saved whole (no per-item history screen of their own) */
const WHOLE: DocKey[] = ["hero", "studio", "projects", "episodes", "team"];

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await requireSession();
  const query = await searchParams;
  const doc = typeof query.doc === "string" && WHOLE.includes(query.doc as DocKey) && query.doc in docSchemas ? (query.doc as DocKey) : null;
  const [docs, activity, names] = await Promise.all([loadDocs(doc ? ["industries", doc] : ["industries"]), listActivity(150), namesByEmail()]);

  if (doc) {
    return (
      <>
        <Link href="/activity" className="u -mb-6 justify-self-start text-[0.9rem] text-muted-foreground">
          ← All changes
        </Link>
        <PageHead title={`${DOC_LABELS[doc]} history`} text="Every saved version, newest first. Restoring one puts it live and keeps the version it replaces." />
        <RestoredNote show={!!query.restored} />
        <HistoryList docKey={doc} item={null} current={docs[doc]} what={DOC_LABELS[doc].toLowerCase()} />
      </>
    );
  }

  const itemName = (key: DocKey, item: string | null) => {
    if (key === "industries") return docs.industries.find((i) => i.slug === item)?.name ?? item ?? "";
    if (key === "pages") return `${PAGES.find((p) => p.key === item)?.label ?? item} page`;
    return DOC_LABELS[key];
  };

  return (
    <>
      <PageHead title="History" text="Every change, newest first, and who made it: saves in the admin and changes to the content in the site's code. Open one to see what changed and to put an earlier version back." />
      <nav aria-label="History by section" className="-mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.92rem]">
        {WHOLE.map((k) => (
          <Link key={k} href={`/activity?doc=${k}`} className="u">
            {DOC_LABELS[k]}
          </Link>
        ))}
      </nav>
      {activity.length === 0 ? (
        <p className="border-t border-border pt-6 text-muted-foreground">Nothing has been saved since history began. Every save from now on is listed here.</p>
      ) : (
        <ol className="border-t border-border">
          {activity.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border py-3.5">
              <span className="grid gap-0.5">
                <Link href={historyPath(r.key, r.item)} className="u justify-self-start">
                  {r.key === "industries" ? `${DOC_LABELS.industries}: ${itemName(r.key, r.item)}` : itemName(r.key, r.item)}
                </Link>
                <span className="text-[0.88rem] text-muted-foreground">
                  {r.action === "restore" ? "Restored an earlier version" : r.action === "code" ? "Changed in the site's code" : "Saved"} by {names.get(r.created_by) ?? r.created_by}
                  {r.action === "code" && r.note ? ` · ${r.note}` : ""}
                </span>
              </span>
              <span className="text-[0.86rem] tabular-nums text-[var(--faint)]">{when(r.created_at)}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
