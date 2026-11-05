import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { siteUrl } from "@/lib/cms/site";
import { PageHead } from "../../../_components/nav";
import { IndustryForm } from "./industry-form";

export const metadata: Metadata = { title: "Industry" };

export default async function IndustryPage({ params }: PageProps<"/industries/[slug]">) {
  await requireSession();
  const { slug } = await params;
  const { industries } = await loadDocs();
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  return (
    <>
      <Link href="/industries" className="u -mb-6 justify-self-start text-[0.9rem] text-muted-foreground">
        ← All industries
      </Link>
      <PageHead title={industry.name} text="Everything on this industry's page. Open a section to edit it; nothing changes on the site until you save." />
      <div className="-mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.92rem]">
        <a href={siteUrl(`/en/industries/${slug}`)} target="_blank" rel="noopener noreferrer" className="u">
          View page ↗
        </a>
        {industry.detail?.work && (
          <a href={siteUrl(`/en/industries/${slug}/work`)} target="_blank" rel="noopener noreferrer" className="u">
            View portfolio ↗
          </a>
        )}
      </div>
      <IndustryForm industry={industry} site={siteUrl("")} />
    </>
  );
}
