import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import type { PageKey } from "@/lib/cms/schema";
import { siteUrl } from "@/lib/cms/site";
import { PageHead } from "../../../_components/nav";
import { PAGES } from "../pages";
import { PageForm } from "./page-form";

export const metadata: Metadata = { title: "Page" };

export default async function PageEditor({ params }: PageProps<"/pages/[page]">) {
  await requireSession();
  const { page } = await params;
  const info = PAGES.find((p) => p.key === page);
  if (!info) notFound();
  const { pages } = await loadDocs();

  return (
    <>
      <Link href="/pages" className="u -mb-6 justify-self-start text-[0.9rem] text-muted-foreground">
        ← All pages
      </Link>
      <PageHead title={`${info.label} page`} text={info.text} />
      <a href={siteUrl(info.path)} target="_blank" rel="noopener noreferrer" className="u -mt-4 justify-self-start text-[0.92rem]">
        View page ↗
      </a>
      <PageForm page={page as PageKey} value={pages[page as PageKey]} site={siteUrl("")} />
    </>
  );
}
