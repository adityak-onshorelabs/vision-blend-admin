import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { PageHead } from "../../../_components/nav";
import { ProjectForm } from "./project-form";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectAdminPage({ params, searchParams }: PageProps<"/work/[slug]">) {
  await requireSession();
  const { slug } = await params;
  const { saved } = await searchParams;
  const { projects } = await loadDocs();
  const project = slug === "new" ? null : projects.find((p) => p.slug === slug);
  if (slug !== "new" && !project) notFound();

  return (
    <>
      <Link href="/work" className="u justify-self-start text-[0.92rem]">
        &larr; All projects
      </Link>
      <PageHead
        title={project ? project.name : "New project"}
        text="Published projects show their Instagram post or reel. Slots are placeholders for case studies still to come."
      />
      {saved && <p role="status" className="-mt-4 text-[0.92rem] text-brand">Project added. The site shows it on the next visit.</p>}
      <ProjectForm project={project ?? null} />
    </>
  );
}
