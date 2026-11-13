"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";

type Step = { element?: string; title: string; text: string };

/**
 * A step-by-step guide for each screen: what each part changes on the site, and exactly how to
 * update it. Steps whose element is missing (owner-only sections, empty lists) are skipped;
 * steps with no element show in the middle of the screen.
 */
const PAGES: Record<string, { label: string; steps: Step[] }> = {
  "/hero": {
    label: "Hero",
    steps: [
      { element: "[data-tour=page-head]", title: "Hero", text: "The first thing visitors see on the home page: a small label, a big tagline and an intro line. This screen changes those three lines." },
      { element: "main figure", title: "Live preview", text: "Shows the hero as you type, before anything is saved, so you can check the line breaks. The last word of the tagline turns brown on the site." },
      { element: "#f-eyebrow", title: "Step 1 · The label", text: "Click in the box and type the small line above the tagline, e.g. “Marketing studio · Est. 2023”. Keep it short and factual." },
      { element: "#f-tagline", title: "Step 2 · The tagline", text: "Type 2 to 6 words. Don't add a full stop: the brown brand dot is added for you. Watch the preview: two lines look best." },
      { element: "#f-lead", title: "Step 3 · The intro line", text: "One or two sentences under the tagline. The counter on the right shows how many characters are left and turns brown near the limit; past it, typing stops." },
      { element: "main button[type=submit]", title: "Step 4 · Save", text: "Click Save hero. A green “Saved” line confirms it, and the site shows the new hero on the next visit (refresh the site to check). Nothing changes on the site until you save." },
      { element: "nav[aria-label=Admin] a[href='/activity']", title: "Undo a change", text: "Saved something by mistake? Open History in the sidebar, choose Hero, open the version you want and click Restore this version." },
    ],
  },
  "/industries": {
    label: "Industries",
    steps: [
      { element: "[data-tour=page-head]", title: "Industries", text: "Every industry has its own page on the site (Real Estate, D2C and so on), sent on its own to prospects. Each one is edited separately." },
      { element: "main ol > li", title: "What each row tells you", text: "The industry's name, whether its hero photo is set, how many showcase cards it has and how many Drive pieces are in its portfolio." },
      { element: "main ol > li a", title: "Step 1 · Open an industry", text: "Click an industry's name to open its editor. Everything on that industry's page is there, section by section." },
      { element: "main ol", title: "Adding a new industry", text: "New industries are added by the developers (they need their own page on the site). Once added, they appear in this list and are edited here like the others." },
    ],
  },
  "/industries/": {
    label: "Industry",
    steps: [
      { element: "[data-tour=page-head]", title: "One industry", text: "Every section of this industry's page, top to bottom, in the same order as the site. Nothing changes on the site until you click Save changes at the bottom." },
      { element: "main a[target=_blank]", title: "Check the live page", text: "View page opens the live industry page in a new tab. Keep it open: after saving, refresh it to see your change." },
      { element: "[data-section='Hero'] > summary", title: "Step 1 · Open a section", text: "Click a section's name (Hero, What we make, FAQs…) to open it, and again to close it. A section with a problem opens by itself and turns red." },
      { element: "[data-field='detail.hero']", title: "Hero photo", text: "Click Upload image and pick a landscape photo (at least 2400 px wide, JPG or WebP under 4.4 MB). It uploads straight away and shows a preview. Replace swaps it; Remove clears it." },
      { element: "[data-field='detail.headline']", title: "Words over the photo", text: "The small line, the title and the intro. In the title, wrap a word in *stars* (like *growth*) to show it in brown. Leave the title empty to use the industry's name." },
      { element: "[data-section='Industries page card'] > summary", title: "The industry's card", text: "How this industry shows on the Industries and home pages: its name, an optional note, a one-line pitch and the services listed on the card." },
      { element: "[data-add='services']", title: "Add a service", text: "+ Add service adds a line; type into it. Each line has ↑ ↓ to reorder and ✕ to remove." },
      { element: "[data-add='detail.offerings']", title: "Add a showcase card", text: "In What we make, + Add creates a new card at the end and opens it. Give it a title and subtitle." },
      { element: "[data-field='detail.offerings'] li", title: "Fill in a card", text: "Click a card to open it. Upload film takes an MP4 under 4.4 MB (bigger films: upload to ImageKit and paste the link), or paste an Instagram post or reel link instead. Add a poster image, choose the frame shape, and paste the studio's Drive folder (internal, never shown)." },
      { element: "[data-field='detail.offerings'] [data-row-tools]", title: "Reorder or remove a card", text: "↑ and ↓ move a card; ✕ removes it. The site shows the cards in this order." },
      { element: "[data-section='FAQs'] > summary", title: "FAQs and other lists", text: "Why it works, Process and FAQs work the same way: + Add for a new point, step or question, type into its fields, ↑ ↓ to reorder, ✕ to remove." },
      { element: "[data-section='Closing and enquiry'] > summary", title: "Closing and contact form", text: "The closing section's title and buttons, and the question visitors see in the contact form when they come from this industry's page. Optional parts can be removed; the section then disappears from the page." },
      { element: "[data-section='Client logos'] > summary", title: "Client logos", text: "The strip of logos under the hero. + Add logo, type the client's name (read out by screen readers), Upload image (a transparent PNG works best) and set its shape. With no logos the strip is hidden." },
      { element: "[data-field='detail.meta']", title: "Search and sharing", text: "The title and description Google and WhatsApp previews show for this page. Keep the title under 60 characters and the description to one or two sentences." },
      { element: "[data-section='Portfolio (from Drive)'] > summary", title: "Portfolio from Drive", text: "The industry's portfolio page. + Add a piece, paste the Drive file's share link (shared as “Anyone with the link”) and check the thumbnail that appears. Give it a title and a category: the filters on the page are built from the categories." },
      { element: "main form > div:last-child button[type=submit]", title: "Save changes", text: "Click Save changes. A green “Saved” line confirms it; refresh the live page to see it. If a field needs a fix, its section opens and the field is marked in red with what to change. “Unsaved changes” means you haven't saved yet; leaving the page warns you." },
      { element: "main form > div:last-child button[type=submit]", title: "If someone else saved first", text: "If another editor saved this industry while you were editing, your save is stopped so neither of you loses work. Copy anything you need, reload the page, and make your change again." },
      { element: "main a[href$='/history']", title: "History and restore", text: "Every version of this industry's page: each save in the admin and each change made in the site's code, with who made it and what changed. Any version can be put back from there." },
    ],
  },
  "/pages": {
    label: "Pages",
    steps: [
      { element: "[data-tour=page-head]", title: "Pages", text: "The words on the site's main pages: titles, intros, section headings, the showreel, beliefs, process steps and search listings." },
      { element: "main ol > li a", title: "Step 1 · Open a page", text: "Click a page (Home, About, Work, Industries, Contact) to edit its copy. The hero's words are on the Hero screen; each industry's page is on Industries." },
    ],
  },
  "/pages/": {
    label: "Page",
    steps: [
      { element: "[data-tour=page-head]", title: "Page copy", text: "Every editable piece of text on this page, grouped in sections. Counters show each field's limit, so the layout keeps its shape." },
      { element: "main a[target=_blank]", title: "Check the live page", text: "View page opens it in a new tab. After saving, refresh it to see your change." },
      { element: "main details[data-section] > summary", title: "Step 1 · Open a section", text: "Click a section's name to open it, and again to close it." },
      { element: "main details[data-section] [data-field] :is(input, textarea)[id^='f-']", title: "Step 2 · Edit the text", text: "Click into a field and type. The counter shows how many characters are left. In a title, wrap a word in *stars* to show it in brown." },
      { element: "main [data-add]", title: "Step 3 · Lists", text: "For lists (beliefs, process steps, next steps), + Add adds an item; each item has ↑ ↓ to reorder and ✕ to remove." },
      { element: "main form > div:last-child button[type=submit]", title: "Step 4 · Save changes", text: "Click Save changes. A green “Saved” line confirms it. If someone else saved this page while you were editing, you're asked to reload first so nothing is overwritten." },
      { element: "main a[href$='/history']", title: "History and restore", text: "Every saved version of this page's copy. Open one to see what changed, and put it back if you need to." },
    ],
  },
  "/work": {
    label: "Work",
    steps: [
      { element: "[data-tour=page-head]", title: "Work", text: "The projects on the Work and home pages, in the order listed here." },
      { element: "main a[href='/work/new']", title: "Add a project", text: "Click Add a project to open a blank one. Fill it in and save; it then appears at the end of this list." },
      { element: "main ol > li", title: "A project", text: "Click a name to edit it. “Published” means it links to its Instagram post; “Slot” is a placeholder for a case study to come." },
      { element: "main ol > li button[aria-label^='Move']", title: "Change the order", text: "Click ↑ or ↓ to move a project. The site follows this order; each click saves straight away." },
      { element: "main [data-tour=feature]", title: "Featured project", text: "Make featured appears on published projects. The featured one opens the Work page as its hero film. Only one can be featured; choosing another replaces it." },
    ],
  },
  "/work/": {
    label: "Project",
    steps: [
      { element: "[data-tour=page-head]", title: "Project", text: "Everything about one project. Fields with a counter have a length limit so cards keep their shape." },
      { element: "#f-name", title: "Step 1 · Name and subtitle", text: "The name is the card's title; the subtitle sits under it (the client, or the series and number)." },
      { element: "#f-category", title: "Step 2 · Type and date", text: "The type (Film, Branding, Content…) and a date as you want it shown, e.g. “Mar 2026”." },
      { element: "#f-summary", title: "Step 3 · Summary and story", text: "One or two sentences for the card. The story below is optional: separate paragraphs with an empty line." },
      { element: "#f-instagram", title: "Step 4 · Instagram", text: "Paste the post or reel link and tick Published on Instagram. For a post, choose its shape so it's cropped correctly. Untick Published to keep the project as a slot." },
      { element: "main input[name=cover]", title: "Step 5 · Cover image", text: "Optional. Choose a JPG, PNG or WebP under 4.4 MB; it uploads when you save. Tick Remove this image to clear the current one." },
      { element: "main button[type=submit]", title: "Step 6 · Save", text: "Click Save project. A green line confirms it. Go back to All projects to reorder or feature it." },
      { element: "main [data-tour=delete-project]", title: "Delete a project", text: "Delete this project, at the bottom, asks once more (Delete for good / Keep it). A deleted project can be brought back from History → Work projects." },
    ],
  },
  "/series": {
    label: "Series",
    steps: [
      { element: "[data-tour=page-head]", title: "A Week at Vision Blend", text: "The reel series on the home and Work pages, newest episode first." },
      { element: "main section", title: "Step 1 · Add an episode", text: "The form starts as Add an episode with the next number filled in. Type the title and the date." },
      { element: "#f-url", title: "Step 2 · The reel link", text: "Paste the reel's own Instagram link (not the profile). Its poster frame becomes the cover." },
      { element: "main section button[type=submit]", title: "Step 3 · Save", text: "Click Add episode. It appears in the list below and on the site on the next visit." },
      { element: "main ol", title: "Edit or delete", text: "Click Edit on an episode to load it into the form above; change it and click Save episode (Cancel goes back to adding). Delete asks once more." },
    ],
  },
  "/team": {
    label: "Team",
    steps: [
      { element: "[data-tour=page-head]", title: "Team", text: "The people on the About page, in this order." },
      { element: "main dl", title: "How it shows", text: "The team size line (“Seven people”) is counted for you. Photos only show once everyone has one, so the grid stays even." },
      { element: "main section", title: "Step 1 · Add a person", text: "Type their name and role. Photo is optional: choose a portrait (it's cropped to 4:5), JPG, PNG or WebP under 4.4 MB." },
      { element: "main section button[type=submit]", title: "Step 2 · Save", text: "Click Add person. They're added to the end of the list." },
      { element: "main ol", title: "Edit, reorder, remove", text: "Edit loads a person into the form above. ↑ ↓ change the order (saved straight away). Remove asks once more; the last person can't be removed." },
    ],
  },
  "/focus": {
    label: "People in focus",
    steps: [
      { element: "[data-tour=page-head]", title: "People in focus", text: "Recognition on the Careers page, such as Employee of the Month. The section stays hidden on the site until a feature has a name or a photo." },
      { element: "main section", title: "Step 1 · Fill a feature", text: "A label (e.g. Employee of the Month), the person's name, a date and a short caption. Add a photo: it's cropped to 4:5, JPG, PNG or WebP under 4.4 MB." },
      { element: "main section button[type=submit]", title: "Step 2 · Save", text: "Click Save. It shows on the Careers page on the next visit." },
      { element: "main ol", title: "Edit, reorder, remove", text: "Edit loads a feature into the form above. ↑ ↓ change the order (saved straight away). Remove asks once more." },
    ],
  },
  "/studio": {
    label: "Studio details",
    steps: [
      { element: "[data-tour=page-head]", title: "Studio details", text: "How to reach the studio: shown on the home and Contact pages and used by every email link on the site." },
      { element: "#f-email", title: "Step 1 · Email", text: "The studio's email address. Add a second address in the next box to copy someone in." },
      { element: "main form section:nth-of-type(2)", title: "Step 2 · Phone numbers", text: "Up to two numbers, each with a name (e.g. “Studio”). Fill both the name and the number; leave a row empty to hide it." },
      { element: "main form section:nth-of-type(3)", title: "Step 3 · City", text: "Shown beside the contact details. Leave it empty to hide it." },
      { element: "main button[type=submit]", title: "Step 4 · Save", text: "Click Save details. Everything on this screen is saved together." },
    ],
  },
  "/activity": {
    label: "History",
    steps: [
      { element: "[data-tour=page-head]", title: "History", text: "Every change to the site's content, newest first: saves in the admin and changes the developers made in the site's code, with who made each one and when." },
      { element: "main nav[aria-label='History by section']", title: "By section", text: "Hero, Studio details, Work projects, Series, Team and People in focus each keep their own versions here. Industries and pages have theirs on their own screens (History and restore)." },
      { element: "main ol > li a", title: "Step 1 · Open a change", text: "Click a change to open that part's history." },
      { element: "main ol", title: "Step 2 · Find the version", text: "Each version shows who made it and when. Open “Changed …” to see every field that changed, the old text crossed out next to the new." },
      { element: "main ol", title: "Step 3 · Restore", text: "Click Restore this version, then Yes, restore. It goes live on the next visit, and the version it replaced is kept, so you can undo the restore the same way." },
    ],
  },
  history: {
    label: "History",
    steps: [
      { element: "[data-tour=page-head]", title: "Versions", text: "Newest first. “Saved” is a change made here in the admin; “Changed in the site's code” is a change the developers deployed, with its commit; “Before history began” is how it was before the first tracked save." },
      { element: "main ol > li .marker", title: "Live on the site", text: "The version visitors see right now." },
      { element: "main ol > li details summary", title: "Step 1 · See what changed", text: "Click “Changed …” to open the list of fields that changed, with the old text crossed out next to the new." },
      { element: "main ol > li button[aria-label^='Restore']", title: "Step 2 · Restore", text: "Click Restore this version, then Yes, restore. That version goes live on the next visit." },
      { element: "main ol > li", title: "Undo a restore", text: "A restore is saved as a new version at the top, and the one it replaced stays in the list, so you can put that back the same way." },
    ],
  },
  "/account": {
    label: "Account",
    steps: [
      { element: "[data-tour=page-head]", title: "Account", text: "Your password, and for owners, who can sign in." },
      { element: "main section:has(ul)", title: "Editors", text: "Everyone who can sign in. Remove asks once more; their access ends straight away." },
      { element: "#f-role", title: "Add an editor", text: "Type their name, email and a temporary password (10+ characters), pick Editor (changes content) or Owner (can also manage editors), and click Add. Share the password privately; they can change it here." },
      { element: "#f-current", title: "Your password", text: "Type your current password, then a new one of at least 10 characters, and click Change password. Every other device signed in to your account is signed out." },
      { element: "[data-tour=signout-all]", title: "Sign out everywhere", text: "Lost a laptop or used a shared computer? This ends every session on your account, this one included." },
      { element: "#f-current", title: "Locked out?", text: "After 5 wrong passwords, sign-in pauses for 15 minutes. Ask an owner to reset your account if you've forgotten your password." },
    ],
  },
};

const SHELL: Step[] = [
  { title: "Welcome to the admin", text: "A quick walk through each screen. Close it any time with Esc; reopen it from Tour in the sidebar." },
  { element: "[data-tour=nav]", title: "Screens", text: "Each link edits one part of the website. History lists every change and lets you put an earlier version back." },
  { element: "[data-tour=session]", title: "Site and sign out", text: "Open the live site in a new tab to check your changes, or sign out." },
  { element: "[data-tour=tour]", title: "Help anytime", text: "“Guide this page” explains just the screen you're on." },
];

const ORDER = ["/hero", "/industries", "/pages", "/work", "/series", "/team", "/focus", "/studio", "/activity", "/account"];
const MODE = "vb-tour"; // sessionStorage: "full" while the full tour crosses pages
const SEEN = "vb-tour-seen"; // localStorage: the full tour has been offered once

function pageKey(path: string) {
  if (PAGES[path]) return path;
  if (path.endsWith("/history")) return "history";
  if (path.startsWith("/work/")) return "/work/";
  if (path.startsWith("/industries/")) return "/industries/";
  if (path.startsWith("/pages/")) return "/pages/";
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
  // Replacing a running tour must not end the full tour (onDestroyed clears it otherwise)
  const replacing = useRef(false);
  // The heading the last tour measured: the next screen's tour waits for a different one
  const measured = useRef<Element | null>(null);
  // The screen the full tour last started on, so re-renders while it streams in don't restart it
  const startedOn = useRef<string | null>(null);

  const run = useCallback(
    (full: boolean) => {
      if (active.current) {
        replacing.current = true;
        active.current.destroy();
        replacing.current = false;
      }
      measured.current = document.querySelector("main [data-tour=page-head]");
      const key = pageKey(pathname);
      const page = key ? PAGES[key] : null;
      const first = full && pathname === ORDER[0];
      const exists = (selector: string) => {
        try {
          return !!document.querySelector(selector);
        } catch {
          return false;
        }
      };
      const steps = [...(first ? SHELL : []), ...(page?.steps ?? [])].filter((s) => !s.element || exists(s.element));
      if (!steps.length) return;

      const next = full ? ORDER[ORDER.indexOf(key ?? "") + 1] : undefined;
      let moving = false;
      const target = (selector: string) => () => {
        const el = document.querySelector(selector) as HTMLElement;
        for (let d = el.closest("details"); d; d = d.parentElement?.closest("details") ?? null) d.open = true;
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const r = el.getBoundingClientRect();
        if (r.bottom > window.innerHeight || r.top < 0) window.scrollBy({ top: r.top - window.innerHeight / 2, behavior: "instant" });
        return el;
      };
      const driveSteps: DriveStep[] = steps.map((s, i) => ({
        element: s.element ? target(s.element) : undefined,
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
          if (!moving && !replacing.current) write(session, MODE, null);
        },
      });
      active.current = d;
      d.drive();
    },
    [pathname, router],
  );

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  // Resume the full tour on the next page, or offer it once on first sign-in. Once per screen.
  useEffect(() => {
    let full = read(session, MODE) === "full";
    if (!full && pathname === ORDER[0] && !read(local, SEEN)) full = true;
    if (!full || startedOn.current === pathname) return;
    write(local, SEEN, "1");
    // Screens stream in: wait (up to 8 s) for this screen's heading, not the previous screen's
    let tries = 0;
    const t = window.setInterval(() => {
      const head = document.querySelector("main [data-tour=page-head]");
      if ((head && head !== measured.current) || ++tries > 40) {
        window.clearInterval(t);
        startedOn.current = pathname;
        window.setTimeout(() => runRef.current(true), 150); // let it paint
      }
    }, 200);
    return () => window.clearInterval(t);
  }, [pathname]);

  useEffect(() => () => active.current?.destroy(), []);

  return (
    <div data-tour="tour" className="flex flex-wrap gap-x-5 gap-y-2">
      <button
        type="button"
        className="u cursor-pointer"
        onClick={() => {
          write(session, MODE, "full");
          startedOn.current = null;
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
