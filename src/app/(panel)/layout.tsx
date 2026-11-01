import Image from "next/image";
import { Suspense } from "react";
import { requireSession } from "@/lib/cms/auth";
import { siteUrl } from "@/lib/cms/site";
import { logout } from "../actions";
import { AdminNav } from "../_components/nav";
import { Tour } from "../_components/tour";

/** Signed-in shell. The session is read from a cookie, so it streams in inside Suspense. */
export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<p className="p-10 text-muted-foreground">Loading…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="grid min-h-svh lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-8 bg-night px-6 py-7 text-[var(--on-night)] [--brand:var(--brand-soft)] lg:sticky lg:top-0 lg:h-svh">
        <div className="grid gap-1.5">
          <Image src="/images/logo-white.png" alt="Vision Blend" width={120} height={24} className="h-6 w-auto justify-self-start" priority />
          <span className="t-label !text-[var(--on-night-muted)]">Admin</span>
        </div>
        <div data-tour="nav">
          <AdminNav owner={session.role === "owner"} />
        </div>
        <div className="mt-auto grid gap-3 border-t border-white/15 pt-5 text-[0.9rem]">
          <Tour />
          <div data-tour="session" className="grid gap-3 border-t border-white/15 pt-3">
          <span className="text-[var(--on-night-muted)]">
            Signed in as <span className="text-[var(--on-night)]">{session.name}</span>
          </span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <a href={siteUrl()} target="_blank" rel="noopener noreferrer" className="u">
              View site ↗
            </a>
            <form action={logout}>
              <button type="submit" className="u cursor-pointer">
                Sign out
              </button>
            </form>
          </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="mx-auto grid max-w-[880px] gap-10">{children}</div>
      </main>
    </div>
  );
}
