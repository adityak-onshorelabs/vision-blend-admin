import type { Metadata } from "next";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { PageHead } from "../../_components/nav";
import { StudioForm } from "./studio-form";

export const metadata: Metadata = { title: "Studio details" };

export default async function StudioPage() {
  await requireSession();
  const { studio } = await loadDocs();
  return (
    <>
      <PageHead
        title="Studio details"
        text="Team size and how to reach the studio. These appear in the hero, on About, on the Contact page and in every email link."
      />
      <StudioForm studio={studio} />
    </>
  );
}
