import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { PageHead } from "../../_components/nav";

export const metadata: Metadata = { title: "Industries" };

export default async function IndustriesAdminPage() {
  await requireSession();
  const { industries } = await loadDocs();

  return (
    <>
      <PageHead title="Industries" text="Each industry has its own page, sent on its own to prospects. Open one to change its hero, showcase films, copy and Drive portfolio." />
      <ol className="border-t border-border">
        {industries.map((ind, i) => {
          const d = ind.detail;
          const facts = [
            d?.hero ? (d.hero.placeholder ? "Stock hero" : "Hero photo") : "No hero photo",
            d ? `${d.offerings.length} showcase cards` : null,
            d?.work ? `${d.work.items.length} Drive pieces` : null,
          ].filter(Boolean);
          return (
            <li key={ind.slug} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-4 border-b border-border py-4">
              <span className="text-[0.78rem] font-medium tabular-nums text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>
              <div className="grid min-w-0 gap-1">
                <Link href={`/industries/${ind.slug}`} className="t-h3 u justify-self-start !text-[1.2rem]">
                  {ind.name}
                </Link>
                <span className="text-[0.88rem] text-muted-foreground">{facts.join(" · ")}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
