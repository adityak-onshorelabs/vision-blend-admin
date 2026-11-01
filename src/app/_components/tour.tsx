"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";

type Step = { element?: string; title: string; text: string };

/** Steps for each screen. Steps whose element is missing (e.g. owner-only sections) are skipped. */
const PAGES: Record<string, { label: string; steps: Step[] }> = {
  "/hero": {
    label: "Hero",
    steps: [
      { element: "[data-tour=page-head]", title: "Hero", text: "The first screen of the home page: a short label, the tagline and an intro line." },
      { element: "main figure", title: "Live preview", text: "Updates as you type, so you can see the shape before saving. The last word of the tagline turns brown." },
      { element: "#f-eyebrow", title: "Label", text: "The small line above the tagline. Keep it short and factual." },
      { element: "#f-tagline", title: "Tagline", text: "2 to 6 words. Leave off the full stop; the brand dot is added for you." },
      { element: "#f-lead", title: "Intro line", text: "One or two sentences. The counter on the right turns brown near the limit." },
      { element: "main button[type=submit]", title: "Save", text: "Nothing changes on the site until you save. The site shows it on the next visit." },
    ],
  },
  "/work": {
    label: "Work",
    steps: [
      { element: "[data-tour=page-head]", title: "Work", text: "Projects on the Work and home pages, in the order listed here." },
      { element: "main a[href='/work/new']", title: "Add a project", text: "Opens a blank project. Publish it with an Instagram link, or save it as a slot for a case study to come." },
      { element: "main ol > li", title: "A project", text: "Click the name to edit it. Brown dot means published; “Slot” means placeholder." },
      { element: "main ol > li button[aria-label^='Move']", title: "Order", text: "The arrows move a project up or down. The site follows this order." },
      { title: "Featured project", text: "“Make featured” appears on published projects with an Instagram link. The featured one opens the Work page as its hero film." },
    ],
  },
  "/work/": {
    label: "Project",
    steps: [
      { element: "[data-tour=page-head]", title: "Project", text: "Everything about one project. Fields with a counter have a length limit so cards keep their shape." },
      { element: "#f-name", title: "Name and subtitle", text: "The name is the card title; the subtitle sits under it, e.g. the client or series." },
      { element: "#f-summary", title: "Summary", text: "One or two sentences shown on the card." },
      { element: "#f-instagram", title: "Instagram", text: "Paste the post or reel link. Untick “Published on Instagram” to keep it as a slot instead." },
      { element: "main input[name=cover]", title: "Cover image", text: "JPEG, PNG or WebP. Used where a card needs a still image." },
      { element: "main button[type=submit]", title: "Save", text: "Saves the project. Go back to All projects to reorder or feature it." },
    ],
  },
  "/series": {
    label: "Series",
    steps: [
      { element: "[data-tour=page-head]", title: "A Week at Vision Blend", text: "Reel episodes, newest first, on the home and Work pages." },
      { element: "main section", title: "Add or edit", text: "This form adds a new episode. Press Edit on an episode below and it loads here instead." },
      { element: "#f-url", title: "Reel link", text: "The reel's own Instagram link, not the profile." },
      { element: "main ol", title: "Episodes", text: "Every episode, with Edit and Delete. Four sit in a row on the site; from five on the row scrolls." },
    ],
  },
  "/team": {
    label: "Team",
    steps: [
      { element: "[data-tour=page-head]", title: "Team", text: "The people on the About page, in this order." },
      { element: "main dl", title: "How it shows", text: "The team size line is counted for you. Photos only appear once everyone has one." },
      { element: "main section", title: "Add or edit a person", text: "Name, role and an optional photo. Press Edit on someone below to change them here." },
      { element: "main ol", title: "The list", text: "Reorder with the arrows. The last person can't be deleted." },
    ],
  },
  "/studio": {
    label: "Studio details",
    steps: [
      { element: "[data-tour=page-head]", title: "Studio details", text: "How to reach the studio: shown on the home and Contact pages and in every email link." },
      { element: "#f-email", title: "Studio email", text: "Briefs from the site go here. Add a second address below to copy someone in." },
      { element: "main form section:nth-of-type(2)", title: "Phone numbers", text: "Names and numbers shown on the Contact page. Leave a row blank to hide it." },
      { element: "main button[type=submit]", title: "Save", text: "Saves all the details at once." },
    ],
  },
  "/account": {
    label: "Account",
    steps: [
      { element: "[data-tour=page-head]", title: "Account", text: "Your password, and for owners, who can sign in." },
      { element: "main section:has(ul)", title: "Editors", text: "Everyone with access. Remove asks once more before it acts." },
      { element: "#f-role", title: "Add an editor", text: "Editors change content. Owners can also add and remove editors. Share the temporary password privately." },
      { element: "#f-current", title: "Your password", text: "Enter your current password, then a new one of at least 10 characters." },
    ],
  },
};

const SHELL: Step[] = [
  { title: "Welcome to the admin", text: "A quick walk through each screen. Close it any time with Esc; reopen it from Tour in the sidebar." },
  { element: "[data-tour=nav]", title: "Screens", text: "Each link edits one part of the website." },
  { element: "[data-tour=session]", title: "Site and sign out", text: "Open the live site in a new tab to check your changes, or sign out." },
  { element: "[data-tour=tour]", title: "Help anytime", text: "“Guide this page” explains just the screen you're on." },
];

const ORDER = ["/hero", "/work", "/series", "/team", "/studio", "/account"];
const MODE = "vb-tour"; // sessionStorage: "full" while the full tour crosses pages
const SEEN = "vb-tour-seen"; // localStorage: the full tour has been offered once

function pageKey(path: string) {
  if (PAGES[path]) return path;
  if (path.startsWith("/work/")) return "/work/";
  return null;
}

function read(store: () => Storage, key: string) {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}
function write(store: () => Storage, key: string, value: string | null) {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {}
}
const session = () => sessionStorage;
const local = () => localStorage;

/** Sidebar links for the full tour and a guide to the current page; also resumes the full tour after navigation. */
export function Tour() {
  const pathname = usePathname();
  const router = useRouter();
  const active = useRef<ReturnType<typeof driver> | null>(null);

  const run = useCallback(
    (full: boolean) => {
      active.current?.destroy();
      const key = pageKey(pathname);
      const page = key ? PAGES[key] : null;
      const first = full && pathname === ORDER[0];
      const steps = [...(first ? SHELL : []), ...(page?.steps ?? [])].filter((s) => !s.element || document.querySelector(s.element));
      if (!steps.length) return;

      const next = full ? ORDER[ORDER.indexOf(key ?? "") + 1] : undefined;
      let moving = false;
      const driveSteps: DriveStep[] = steps.map((s, i) => ({
        element: s.element,
        popover: {
          title: s.title,
          description: s.text,
          ...(i === steps.length - 1 && { doneBtnText: next ? `Next: ${PAGES[next].label} →` : "Done" }),
        },
      }));

      const d = driver({
        steps: driveSteps,
        showProgress: true,
        progressText: full ? `${page?.label ?? ""} · {{current}} of {{total}}` : "{{current}} of {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Back",
        popoverClass: "vb-tour",
        stagePadding: 6,
        stageRadius: 0,
        overlayColor: "oklch(0.17 0.006 40)",
        overlayOpacity: 0.6,
        allowClose: true,
        onNextClick: (_el, _step, { driver: dr }) => {
          if (dr.hasNextStep()) return dr.moveNext();
          if (next) {
            moving = true;
            write(session, MODE, "full");
            router.push(next);
          }
          dr.destroy();
        },
        onDestroyed: () => {
          active.current = null;
          if (!moving) write(session, MODE, null);
        },
      });
      active.current = d;
      d.drive();
    },
    [pathname, router],
  );

  // Resume the full tour on the next page, or offer it once on first sign-in.
  useEffect(() => {
    let full = read(session, MODE) === "full";
    if (!full && pathname === ORDER[0] && !read(local, SEEN)) full = true;
    if (!full) return;
    write(local, SEEN, "1");
    const t = window.setTimeout(() => run(true), 400); // let the page paint before measuring
    return () => window.clearTimeout(t);
  }, [pathname, run]);

  useEffect(() => () => active.current?.destroy(), []);

  return (
    <div data-tour="tour" className="flex flex-wrap gap-x-5 gap-y-2">
      <button
        type="button"
        className="u cursor-pointer"
        onClick={() => {
          write(session, MODE, "full");
          if (pathname === ORDER[0]) run(true);
          else router.push(ORDER[0]);
        }}
      >
        Full tour
      </button>
      {pageKey(pathname) && (
        <button type="button" className="u cursor-pointer" onClick={() => run(false)}>
          Guide this page
        </button>
      )}
    </div>
  );
}
