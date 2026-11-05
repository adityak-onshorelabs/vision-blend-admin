import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/cms/auth";
import { PageHead } from "../../_components/nav";
import { PAGES } from "./pages";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesAdmin() {
  await requireSession();
  return (
    <>
      <PageHead title="Pages" text="The words on each page of the site: titles, intros, section headings and search listings." />
      <ol className="border-t border-border">
        {PAGES.map((p, i) => (
          <li key={p.key} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-4 border-b border-border py-4">
            <span className="text-[0.78rem] font-medium tabular-nums text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>
            <div className="grid min-w-0 gap-1">
              <Link href={`/pages/${p.key}`} className="t-h3 u justify-self-start !text-[1.2rem]">
                {p.label}
              </Link>
              <span className="text-[0.88rem] text-muted-foreground">{p.text}</span>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
