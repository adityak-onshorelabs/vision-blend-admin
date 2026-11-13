import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/cms/auth";
import { loadDocs } from "@/lib/cms/admin-data";
import { moveFocus } from "../../actions";
import { PageHead } from "../../_components/nav";
import { DeleteFocus, FocusForm } from "./focus-form";

export const metadata: Metadata = { title: "People in focus" };

/** A feature shows on the site once it has a name or a photo */
const isLive = (f: { name?: string; photo?: string }) => !!(f.name || f.photo);

export default async function FocusAdminPage({ searchParams }: PageProps<"/focus">) {
  // Started with the session check, not after it; only rendered once the check has passed
  const content = loadDocs(["focus"]);
  content.catch(() => {});
  await requireSession();
  const { edit, saved } = await searchParams;
  const { focus } = await content;
  const index = edit === undefined ? -1 : Number(edit);
  const editing = focus[index] ?? null;
  const live = focus.filter(isLive).length;

  return (
    <>
      <PageHead
        title="People in focus"
        text="Recognition on the Careers page, such as Employee of the Month, in this order. The section is hidden on the site until a feature has a name or a photo."
      />
      {saved && <p role="status" className="-mt-4 text-[0.92rem] text-brand">Saved. The site shows it on the next visit.</p>}

      <dl className="grid gap-5 border-b border-border pb-6 sm:grid-cols-2">
        <div className="grid gap-1">
          <dt className="t-label">On the Careers page</dt>
          <dd className="text-[1.05rem]">
            {live === 0 ? "Hidden" : `${live} ${live === 1 ? "feature" : "features"}`}
            <span className="block text-[0.88rem] text-muted-foreground">
              {live === 0 ? "Add a name or photo to a feature to show the section." : "Features without a name or photo stay hidden."}
            </span>
          </dd>
        </div>
      </dl>

      <section className="grid gap-6 bg-paper p-6 sm:p-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="t-label marker">{editing ? `Edit ${editing.name ?? editing.label}` : "Add a feature"}</h2>
          {editing && (
            <Link href="/focus" className="u text-[0.9rem]">
              Cancel
            </Link>
          )}
        </div>
        <FocusForm key={editing ? index : "new"} feature={editing} index={editing ? index : null} />
      </section>

      {focus.length > 0 && (
        <ol className="border-t border-border">
          {focus.map((f, i) => (
            <li key={`${f.label}-${i}`} className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-border py-4 sm:grid-cols-[48px_minmax(0,1fr)_auto]">
              {f.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file
                <img src={f.photo} alt="" className="aspect-[4/5] w-12 object-cover" />
              ) : (
                <span className="text-[0.78rem] font-medium tabular-nums text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>
              )}
              <div className="grid min-w-0 gap-0.5">
                <span className="truncate text-[1.05rem]">{f.name ?? "No name yet"}</span>
                <span className="text-[0.86rem] text-muted-foreground">
                  {f.label}
                  {f.date && ` · ${f.date}`}
                  {!isLive(f) && " · Hidden until it has a name or photo"}
                </span>
              </div>
              <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-3">
                <Link href={`/focus?edit=${i}`} className="cta cta-line cta-sm">
                  Edit
                </Link>
                <form action={moveFocus}>
                  <input type="hidden" name="index" value={i} />
                  <input type="hidden" name="dir" value="up" />
                  <button type="submit" disabled={i === 0} aria-label={`Move ${f.name ?? f.label} up`} className="cta cta-line cta-sm disabled:opacity-30">↑</button>
                </form>
                <form action={moveFocus}>
                  <input type="hidden" name="index" value={i} />
                  <input type="hidden" name="dir" value="down" />
                  <button type="submit" disabled={i === focus.length - 1} aria-label={`Move ${f.name ?? f.label} down`} className="cta cta-line cta-sm disabled:opacity-30">↓</button>
                </form>
                <DeleteFocus index={i} label={f.label} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
