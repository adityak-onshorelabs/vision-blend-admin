import type { Metadata } from "next";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { PageHead } from "../../_components/nav";
import { StudioForm } from "./studio-form";

export const metadata: Metadata = { title: "Studio details" };

export default async function StudioPage() {
  // In parallel: the content is only rendered once the session check has passed
  const [, { studio }] = await Promise.all([requireSession(), loadDocs(["studio"])]);
  return (
    <>
      <PageHead
        title="Studio details"
        text="How to reach the studio. These appear on the home page, on the Contact page and in every email link."
      />
      <StudioForm studio={studio} />
    </>
  );
}
