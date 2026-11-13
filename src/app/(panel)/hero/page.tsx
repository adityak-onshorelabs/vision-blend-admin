import type { Metadata } from "next";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { PageHead } from "../../_components/nav";
import { HeroForm } from "./hero-form";

export const metadata: Metadata = { title: "Hero" };

export default async function HeroPage() {
  // In parallel: the content is only rendered once the session check has passed
  const [, { hero }] = await Promise.all([requireSession(), loadDocs(["hero"])]);
  return (
    <>
      <PageHead
        title="Hero"
        text="The first screen of the home page. Each line has a limit so the centred statement keeps its shape on every screen size."
      />
      <HeroForm hero={hero} />
    </>
  );
}
