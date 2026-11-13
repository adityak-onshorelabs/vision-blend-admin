import { versionOf } from "@/lib/cms/admin-data";
import { listRevisions, listUsers, type Revision } from "@/lib/cms/db";
import { diff, sectionsOf, when } from "@/lib/cms/history";
import { docSchemas, industrySchema, pagesSchema, type DocKey, type PageKey } from "@/lib/cms/schema";
import { cn } from "@/lib/utils";
import { RestoreButton } from "./restore-button";

/*
  The versions of one document part (an industry, a page's copy), newest first, from two sources:
  saves in the admin, and changes in the site's code (recorded when a deploy changes the defaults).
  Each shows who made it, when, and what it changed from the previous version of the same source,
  with a restore button. Restoring saves that version again as the newest, so it can be undone.
*/

/** A stored version in the schema's own key order (Postgres reorders JSON keys), or null if it no longer fits */
export function canonical(key: DocKey, item: string | null, data: unknown): unknown {
  const schema = key === "industries" && item ? industrySchema : key === "pages" && item ? pagesSchema.shape[item as PageKey] : docSchemas[key];
  if (!schema) return null;
  const parsed = schema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function namesByEmail() {
  const users = await listUsers().catch(() => []);
  return new Map(users.map((u) => [u.email, u.name]));
}

function actionLabel(r: Revision, byId: Map<number, Revision>, firstCode: boolean) {
  if (r.action === "code") return firstCode ? "In the site's code" : "Changed in the site's code";
  if (r.action === "baseline") return "Before history began";
  if (r.action === "restore") {
    const from = r.restored_from ? byId.get(r.restored_from) : undefined;
    return from ? `Restored the version from ${when(from.created_at)}` : "Restored an earlier version";
  }
  return "Saved";
}

export async function HistoryList({ docKey, item, current, what }: { docKey: DocKey; item: string | null; current: unknown; what: string }) {
  const [revisions, names] = await Promise.all([listRevisions(docKey, item, 40), namesByEmail()]);
  if (!revisions.length) {
    return (
      <p className="border-t border-border pt-6 text-muted-foreground">
        No versions yet. From the next save in the admin, or the next change to {what} in the site&apos;s code, every version is kept here and can be put back.
      </p>
    );
  }
  const byId = new Map(revisions.map((r) => [r.id, r]));
  const currentVersion = versionOf(current);
  // Only the newest matching version is "live"; an older identical one can still be restored
  const rows = revisions.map((r) => ({ r, data: canonical(docKey, item, r.data) }));
  const liveId = rows.find(({ data }) => data !== null && versionOf(data) === currentVersion)?.r.id;

  return (
    <ol className="border-t border-border">
      {rows.map(({ r, data }, i) => {
        // Code changes compare with the previous code version, admin saves with the previous save
        const code = r.action === "code";
        const older = rows.slice(i + 1).find((o) => (o.r.action === "code") === code);
        const changes = older ? diff(docKey, older.data ?? older.r.data, data ?? r.data) : null;
        const live = r.id === liveId;
        const who = r.action === "baseline" ? "" : names.get(r.created_by) ?? r.created_by;
        const firstCode = code && !older && revisions.length < 40;
        return (
          <li key={r.id} className={cn("grid gap-3 border-b border-border py-5", live && "bg-paper -mx-4 px-4")}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="grid gap-0.5">
                <span className="font-medium">
                  {actionLabel(r, byId, firstCode)}
                  {who && <span className="font-normal text-muted-foreground"> by {who}</span>}
                </span>
                {code && r.note && <span className="text-[0.88rem] text-muted-foreground">{r.note}</span>}
                <span className="text-[0.86rem] tabular-nums text-[var(--faint)]">{when(r.created_at)}</span>
              </span>
              {live ? (
                <span className="t-label marker">Live on the site</span>
              ) : data === null ? (
                <span className="text-[0.86rem] text-muted-foreground">No longer fits the editor</span>
              ) : (
                <RestoreButton id={r.id} label={`Restore the version from ${when(r.created_at)}`} />
              )}
            </div>
            {changes && (
              <details className="group">
                <summary className="cursor-pointer list-none text-[0.92rem] text-muted-foreground [&::-webkit-details-marker]:hidden">
                  {changes.changes.length ? (
                    <>
                      Changed {sectionsOf(changes.changes).join(", ")} <span className="u">({changes.changes.length + changes.more} {changes.changes.length + changes.more === 1 ? "field" : "fields"})</span>
                    </>
                  ) : (
                    "Same content as the version before"
                  )}
                </summary>
                {changes.changes.length > 0 && (
                  <ul className="mt-4 grid gap-3">
                    {changes.changes.map((c, k) => (
                      <li key={k} className="grid gap-1.5 border-s-2 border-border ps-4 text-[0.9rem]">
                        <span className="t-label">{c.path}</span>
                        <span className="grid gap-1 sm:grid-cols-2 sm:gap-4">
                          <span className="min-w-0 break-words text-muted-foreground">
                            <span className="sr-only">Before: </span>
                            <del className="decoration-[var(--faint)]">{c.before}</del>
                          </span>
                          <span className="min-w-0 break-words">
                            <span className="sr-only">After: </span>
                            {c.after}
                          </span>
                        </span>
                      </li>
                    ))}
                    {changes.more > 0 && <li className="text-[0.88rem] text-muted-foreground">…and {changes.more} more</li>}
                  </ul>
                )}
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Shown after a restore */
export function RestoredNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="status" className="-mt-4 text-[0.92rem] text-brand">
      Restored. The site shows that version on the next visit, and the version it replaced is kept below.
    </p>
  );
}
