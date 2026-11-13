import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { HistoryList, RestoredNote } from "../../../../_components/history";
import { PageHead } from "../../../../_components/nav";

export const metadata: Metadata = { title: "Industry history" };

export default async function IndustryHistory({ params, searchParams }: PageProps<"/industries/[slug]/history">) {
  await requireSession();
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { industries } = await loadDocs();
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  return (
    <>
      <Link href={`/industries/${slug}`} className="u -mb-6 justify-self-start text-[0.9rem] text-muted-foreground">
        ← Back to {industry.name}
      </Link>
      <PageHead
        title={`${industry.name} history`}
        text="Every saved version of this industry's page, newest first. Open a version to see what changed; restoring one puts it live and keeps the version it replaces, so a restore can be undone too."
      />
      <RestoredNote show={!!query.restored} />
      <HistoryList docKey="industries" item={slug} current={industry} what="this industry's page" />
    </>
  );
}
