import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import type { PageKey } from "@/lib/cms/schema";
import { HistoryList, RestoredNote } from "../../../../_components/history";
import { PageHead } from "../../../../_components/nav";
import { PAGES } from "../../pages";

export const metadata: Metadata = { title: "Page history" };

export default async function PageHistory({ params, searchParams }: PageProps<"/pages/[page]/history">) {
  // Started with the session check, not after it; only rendered once the check has passed
  const content = loadDocs(["pages"]);
  content.catch(() => {});
  await requireSession();
  const [{ page }, query] = await Promise.all([params, searchParams]);
  const info = PAGES.find((p) => p.key === page);
  if (!info) notFound();
  const { pages } = await content;

  return (
    <>
      <Link href={`/pages/${page}`} className="u -mb-6 justify-self-start text-[0.9rem] text-muted-foreground">
        ← Back to the {info.label} page
      </Link>
      <PageHead title={`${info.label} page history`} text="Every saved version of this page's copy, newest first. Restoring one puts it live and keeps the version it replaces." />
      <RestoredNote show={!!query.restored} />
      <HistoryList docKey="pages" item={page} current={pages[page as PageKey]} what={`the ${info.label} page`} />
    </>
  );
}
