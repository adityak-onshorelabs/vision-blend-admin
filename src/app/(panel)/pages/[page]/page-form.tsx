"use client";

import type { CmsPages, PageKey } from "@/lib/cms/schema";
import { savePage } from "../../../actions";
import { DocEditor, hintStars, type FieldSpec, type SectionSpec } from "../../../_components/doc-editor";

const t = (key: string, label: string, max: number, extra: Partial<{ rows: number; hint: string }> = {}): FieldSpec => ({ kind: "text", key, label, max, ...extra });
const title = (key = "title", label = "Title", max = 80) => t(key, label, max, { hint: hintStars() });

const search: SectionSpec = {
  title: "Search and sharing",
  hint: "The title and description Google and link previews show.",
  fields: [t("metaTitle", "Page title", 70), t("metaDescription", "Description", 170, { rows: 3 })],
};

const head = (key: string, label: string): FieldSpec => ({
  kind: "group",
  key,
  label,
  fields: [t("label", "Small label", 30), title(), t("text", "Text", 240, { rows: 2 })],
});

const titleTextList = (key: string, label: string, limit: number): FieldSpec => ({
  kind: "list",
  key,
  label,
  limit,
  title: (x) => x?.title,
  empty: () => ({ title: "", text: "" }),
  fields: [t("title", "Title", 60), t("text", "Text", 240, { rows: 2 })],
});

const PAGE_SPECS: Record<PageKey, SectionSpec[]> = {
  home: [
    {
      title: "Showreel",
      hint: "The film that opens on scroll, under the hero. The hero's own words are on the Hero screen.",
      fields: [
        {
          kind: "group",
          key: "showreel",
          label: "Showreel",
          fields: [
            { kind: "media", key: "src", label: "Film", accept: "video", folder: "home", hint: "MP4 (H.264), 1080p. Over 4.4 MB: upload to ImageKit and paste the link." },
            { kind: "media", key: "poster", label: "Poster", accept: "image", folder: "home" },
            t("label", "Small label", 40),
            t("title", "Title", 60),
            t("sub", "Subtitle", 80),
            t("date", "Date", 20),
            { kind: "url", key: "instagram", label: "Instagram link", placeholder: "https://www.instagram.com/p/…" },
            {
              kind: "group",
              key: "card",
              label: "Opening card",
              fields: [t("left", "Left word", 30), t("right", "Right words", 40), t("place", "Place line", 60), t("line", "Credit line", 100)],
            },
          ],
        },
      ],
    },
    {
      title: "Section headings",
      fields: [head("work", "Selected work"), head("services", "Industries"), head("beliefs", "Beliefs"), head("process", "Process"), head("series", "Series"), head("contact", "Contact")],
    },
    {
      title: "Beliefs",
      fields: [
        {
          kind: "list",
          key: "beliefList",
          label: "Beliefs",
          limit: 8,
          title: (x) => x?.text,
          empty: () => ({ text: "", date: "", url: "" }),
          fields: [t("text", "Belief", 120, { rows: 2 }), t("date", "Date", 20), { kind: "url", key: "url", label: "Instagram post", placeholder: "https://www.instagram.com/p/…" }],
        },
      ],
    },
    {
      title: "Process steps",
      fields: [
        {
          kind: "list",
          key: "steps",
          label: "Steps",
          limit: 6,
          title: (x) => x?.name,
          empty: () => ({ name: "", text: "", out: "" }),
          fields: [t("name", "Step", 30), t("text", "What happens", 240, { rows: 2 }), t("out", "What you get", 60)],
        },
      ],
    },
    search,
  ],
  about: [
    {
      title: "Page",
      fields: [title("title", "Title", 100), t("lead", "Intro line", 240, { rows: 2 }), { kind: "strings", key: "paragraphs", label: "Paragraphs", item: "Paragraph", max: 600, rows: 4, limit: 6 }],
    },
    {
      title: "Team and joining",
      hint: "The people themselves are on the Team screen; a team count in the title updates itself.",
      fields: [
        { kind: "group", key: "team", label: "Team", fields: [title("title", "Title"), t("text", "Text", 300, { rows: 3 })] },
        { kind: "group", key: "join", label: "Work with us", fields: [title("title", "Title", 60), t("text", "Text", 240, { rows: 2 })] },
      ],
    },
    search,
  ],
  workPage: [
    {
      title: "Page",
      hint: "The projects themselves are on the Work screen.",
      fields: [
        title(),
        t("lead", "Intro line", 240, { rows: 2 }),
        t("indexLabel", "Index label", 30),
        title("studioTitle", "From the studio: title"),
        t("studioText", "From the studio: text", 240, { rows: 2 }),
        t("nextTitle", "Coming next: title", 80),
        t("nextText", "Coming next: text", 240, { rows: 2 }),
        title("ctaTitle", "Closing title"),
        t("ctaText", "Closing text", 240, { rows: 2 }),
      ],
    },
    search,
  ],
  industriesPage: [{ title: "Page", hint: "Each industry's own page is on the Industries screen.", fields: [title(), t("lead", "Intro line", 240, { rows: 2 })] }, search],
  contactPage: [
    {
      title: "Page",
      hint: "Email and phone numbers are on the Studio details screen.",
      fields: [title(), t("lead", "Intro line", 240, { rows: 2 }), t("collaborate", "Note for creatives", 200, { rows: 2 })],
    },
    {
      title: "What happens next",
      fields: [{ kind: "group", key: "next", label: "What happens next", fields: [t("title", "Title", 60), titleTextList("steps", "Steps", 5)] }],
    },
    {
      title: "Talk first and explore",
      fields: [
        { kind: "group", key: "talk", label: "Rather talk first", fields: [title("title", "Title", 60), t("text", "Text", 240, { rows: 2 }), t("cta", "Button", 40)] },
        {
          kind: "group",
          key: "explore",
          label: "Not ready yet",
          fields: [
            title("title", "Title", 60),
            // Link targets stay as built; no add or remove (no `empty`)
            { kind: "list", key: "links", label: "Links", title: (x) => x?.title, fields: [t("title", "Title", 60), t("text", "Text", 160, { rows: 2 })] },
          ],
        },
      ],
    },
    search,
  ],
};

export function PageForm({ page, value, site }: { page: PageKey; value: CmsPages[PageKey]; site: string }) {
  return <DocEditor value={value} sections={PAGE_SPECS[page]} action={savePage.bind(null, page)} site={site} />;
}
