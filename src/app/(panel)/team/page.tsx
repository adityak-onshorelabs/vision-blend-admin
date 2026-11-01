import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { teamLine } from "@/lib/cms/team";
import { moveMember } from "../../actions";
import { PageHead } from "../../_components/nav";
import { DeleteMember, MemberForm } from "./member-form";

export const metadata: Metadata = { title: "Team" };

export default async function TeamAdminPage({ searchParams }: PageProps<"/team">) {
  await requireSession();
  const { edit, saved } = await searchParams;
  const { team } = await loadDocs();
  const index = edit === undefined ? -1 : Number(edit);
  const editing = team[index] ?? null;
  const photos = team.filter((m) => m.photo).length;
  const last = team.length === 1;

  return (
    <>
      <PageHead
        title="Team"
        text="The people on the About page, in this order. The team size on the site is counted from this list."
      />
      {saved && <p role="status" className="-mt-4 text-[0.92rem] text-brand">Saved. The site shows it on the next visit.</p>}

      <dl className="grid gap-5 border-b border-border pb-6 sm:grid-cols-2">
        <div className="grid gap-1">
          <dt className="t-label">Shown on the site as</dt>
          <dd className="text-[1.05rem]">{teamLine(team.length)}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="t-label">Photos</dt>
          <dd className="text-[1.05rem]">
            {photos} of {team.length}
            <span className="block text-[0.88rem] text-muted-foreground">
              {photos === team.length ? "Everyone has a photo, so the About page shows them." : "Photos show on the site once everyone has one. Until then the team is listed by name and role."}
            </span>
          </dd>
        </div>
      </dl>

      <section className="grid gap-6 bg-paper p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="t-label marker">{editing ? `Edit ${editing.name}` : "Add a person"}</h2>
          {editing && (
            <Link href="/team" className="u text-[0.9rem]">
              Cancel
            </Link>
          )}
        </div>
        <MemberForm key={editing ? index : "new"} member={editing} index={editing ? index : null} />
      </section>

      <ol className="border-t border-border">
        {team.map((m, i) => (
          <li key={m.name} className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-border py-4 sm:grid-cols-[48px_minmax(0,1fr)_auto]">
            {m.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
              <img src={m.photo} alt="" className="aspect-[4/5] w-12 object-cover" />
            ) : (
              <span className="text-[0.78rem] font-medium tabular-nums text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>
            )}
            <div className="grid min-w-0 gap-0.5">
              <span className="truncate text-[1.05rem]">{m.name}</span>
              <span className="text-[0.86rem] text-muted-foreground">
                {m.role}
                {!m.photo && " · No photo yet"}
              </span>
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3">
              <Link href={`/team?edit=${i}`} className="cta cta-line cta-sm">
                Edit
              </Link>
              <form action={moveMember}>
                <input type="hidden" name="index" value={i} />
                <input type="hidden" name="dir" value="up" />
                <button type="submit" disabled={i === 0} aria-label={`Move ${m.name} up`} className="cta cta-line cta-sm disabled:opacity-30">↑</button>
              </form>
              <form action={moveMember}>
                <input type="hidden" name="index" value={i} />
                <input type="hidden" name="dir" value="down" />
                <button type="submit" disabled={i === team.length - 1} aria-label={`Move ${m.name} down`} className="cta cta-line cta-sm disabled:opacity-30">↓</button>
              </form>
              {!last && <DeleteMember index={i} name={m.name} />}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
