"use client";

import type { CmsIndustry } from "@/lib/cms/schema";
import { saveIndustry } from "../../../actions";
import { DocEditor, hintStars, type FieldSpec, type SectionSpec } from "../../../_components/doc-editor";

const titleText = (title: string, text: string): FieldSpec[] => [
  { kind: "text", key: "title", label: title, max: 60 },
  { kind: "text", key: "text", label: text, max: 240, rows: 3 },
];

const sections: SectionSpec[] = [
  {
    title: "Hero",
    hint: "The full-screen photo and the words over it.",
    at: "detail",
    fields: [
      { kind: "photo", key: "hero", label: "Hero photo", folder: "industries", hint: "Landscape, at least 2400 px wide. JPG or WebP under 4.4 MB." },
      { kind: "text", key: "eyebrow", label: "Small line above the title", max: 60 },
      { kind: "text", key: "headline", label: "Title", max: 80, hint: hintStars("Leave empty to use the industry name.") },
      { kind: "text", key: "lead", label: "Intro line", max: 300, rows: 3 },
    ],
  },
  {
    title: "Industries page card",
    hint: "How this industry shows on the Industries page and the home page.",
    fields: [
      { kind: "text", key: "name", label: "Name", max: 30 },
      { kind: "text", key: "note", label: "Clarifying note", max: 60, hint: "Optional, e.g. “Direct-to-consumer brands”." },
      { kind: "text", key: "summary", label: "One-line pitch", max: 160, rows: 2 },
      { kind: "strings", key: "services", label: "Services listed on the card", item: "Service", max: 40, limit: 10 },
    ],
  },
  {
    title: "Introduction",
    hint: "Optional. With no paragraphs the section is hidden.",
    at: "detail",
    fields: [
      { kind: "text", key: "introTitle", label: "Section title", max: 80, hint: hintStars() },
      { kind: "strings", key: "paragraphs", label: "Paragraphs", item: "Paragraph", max: 800, rows: 4, limit: 6 },
    ],
  },
  {
    title: "What we make",
    hint: "The showcase cards: a looping film (or a still) with a title and subtitle.",
    at: "detail",
    fields: [
      { kind: "text", key: "servicesTitle", label: "Section title", max: 80, hint: hintStars() },
      {
        kind: "list",
        key: "offerings",
        label: "Cards",
        limit: 16,
        title: (o) => o?.title,
        empty: () => ({ title: "", subtitle: "", text: "", ratio: [16, 9] }),
        fields: [
          { kind: "text", key: "title", label: "Title", max: 40 },
          { kind: "text", key: "subtitle", label: "Subtitle", max: 80 },
          { kind: "media", key: "video", label: "Showcase film", accept: "video", folder: "industries", optional: true, hint: "A short muted loop: MP4 (H.264), 1080p, under 4.4 MB. Bigger films: upload to ImageKit and paste the link." },
          { kind: "url", key: "instagram", label: "…or an Instagram post or reel", placeholder: "https://www.instagram.com/reel/…", hint: "Plays in Instagram's own player when there is no film above. Its shape is set for you." },
          { kind: "photo", key: "image", label: "Poster / still", folder: "industries", hint: "Shown while the film loads, or instead of it when there is no film." },
          { kind: "ratio", key: "ratio", label: "Frame" },
          { kind: "folder", key: "assets", label: "Drive folder (internal)", hint: "Where the studio keeps this category's files. Never shown on the site." },
          { kind: "text", key: "text", label: "Paragraph (optional)", max: 400, rows: 3, hint: "Only shown on cards without a subtitle." },
        ],
      },
    ],
  },
  {
    title: "Why it works",
    at: "detail",
    fields: [
      {
        kind: "group",
        key: "value",
        label: "What the work is designed to do",
        optional: () => ({ title: "", items: [{ title: "", text: "" }] }),
        hint: "Without this, the challenges below are shown instead.",
        fields: [
          { kind: "text", key: "title", label: "Section title", max: 80, hint: hintStars() },
          { kind: "list", key: "items", label: "Points", limit: 6, title: (x) => x?.title, empty: () => ({ title: "", text: "" }), fields: titleText("Point", "Explanation") },
        ],
      },
      { kind: "list", key: "challenges", label: "Challenges", limit: 6, title: (x) => x?.title, empty: () => ({ title: "", text: "" }), fields: titleText("Challenge", "Explanation") },
    ],
  },
  {
    title: "Process",
    at: "detail",
    fields: [
      {
        kind: "group",
        key: "process",
        label: "Process",
        optional: () => ({ title: "Process", steps: [{ name: "", text: "" }] }),
        fields: [
          { kind: "text", key: "title", label: "Section title", max: 60, hint: hintStars() },
          {
            kind: "list",
            key: "steps",
            label: "Steps",
            limit: 8,
            title: (x) => x?.name,
            empty: () => ({ name: "", text: "" }),
            fields: [
              { kind: "text", key: "name", label: "Step", max: 40 },
              { kind: "text", key: "text", label: "What happens", max: 240, rows: 3 },
              { kind: "text", key: "out", label: "What you get (optional)", max: 60 },
            ],
          },
        ],
      },
    ],
  },
  {
    title: "FAQs",
    at: "detail",
    fields: [
      { kind: "text", key: "faqTitle", label: "Section title", max: 80, hint: hintStars() },
      {
        kind: "list",
        key: "faqs",
        label: "Questions",
        limit: 12,
        title: (x) => x?.q,
        empty: () => ({ q: "", a: "" }),
        fields: [
          { kind: "text", key: "q", label: "Question", max: 160 },
          { kind: "text", key: "a", label: "Answer", max: 600, rows: 4 },
        ],
      },
    ],
  },
  {
    title: "Closing and enquiry",
    at: "detail",
    fields: [
      {
        kind: "group",
        key: "cta",
        label: "Closing section",
        optional: () => ({ title: "" }),
        fields: [
          { kind: "text", key: "title", label: "Title", max: 60, hint: hintStars() },
          { kind: "text", key: "text", label: "Text (optional)", max: 240, rows: 2 },
          { kind: "text", key: "primary", label: "Main button", max: 30, hint: "Optional. Default: Start a project" },
          { kind: "text", key: "secondary", label: "Second button", max: 30, hint: "Optional. Default: Email us" },
        ],
      },
      {
        kind: "group",
        key: "enquiry",
        label: "Contact form, when coming from this page",
        optional: () => ({ prompt: "", placeholder: "" }),
        fields: [
          { kind: "text", key: "prompt", label: "Question", max: 80 },
          { kind: "text", key: "placeholder", label: "Hint in the box", max: 200, rows: 2 },
        ],
      },
    ],
  },
  {
    title: "Search and sharing",
    hint: "The title and description Google and link previews show.",
    at: "detail",
    fields: [
      {
        kind: "group",
        key: "meta",
        label: "Search listing",
        optional: () => ({ title: "", description: "" }),
        fields: [
          { kind: "text", key: "title", label: "Page title", max: 70 },
          { kind: "text", key: "description", label: "Description", max: 170, rows: 3 },
        ],
      },
    ],
  },
  {
    title: "Portfolio (from Drive)",
    hint: "The /work subpage: every piece plays in Drive's player. Paste each file's share link.",
    at: "detail",
    fields: [
      {
        kind: "group",
        key: "work",
        label: "Portfolio page",
        optional: () => ({ title: "", lead: "", items: [] }),
        fields: [
          { kind: "text", key: "title", label: "Title", max: 80, hint: hintStars() },
          { kind: "text", key: "lead", label: "Intro line", max: 240, rows: 2 },
          {
            kind: "list",
            key: "items",
            label: "Pieces",
            limit: 120,
            title: (x) => [x?.title, x?.category].filter(Boolean).join(" · "),
            empty: () => ({ title: "", category: "", drive: "", kind: "film", ratio: [16, 9] }),
            hint: "The filters on the page are built from the categories, in the order they first appear.",
            fields: [
              { kind: "drive", key: "drive", label: "Drive file", hint: "Paste the file's share link (shared as “Anyone with the link”), or leave empty and use Instagram below." },
              { kind: "url", key: "instagram", label: "…or an Instagram post or reel", placeholder: "https://www.instagram.com/p/…" },
              { kind: "text", key: "title", label: "Title", max: 80 },
              { kind: "text", key: "category", label: "Category", max: 40, hint: "Use the same spelling as the showcase cards, e.g. Ads" },
              { kind: "text", key: "client", label: "Client (optional)", max: 40 },
              { kind: "select", key: "kind", label: "Type", options: [["film", "Film"], ["still", "Still image"]] },
              { kind: "ratio", key: "ratio", label: "Frame" },
              { kind: "media", key: "poster", label: "Cover (optional)", accept: "image", folder: "industries", optional: true, hint: "Replaces Drive's thumbnail, for films that open on a dark title card." },
            ],
          },
        ],
      },
    ],
  },
];

export function IndustryForm({ industry, site }: { industry: CmsIndustry; site: string }) {
  return <DocEditor value={industry} sections={sections} action={saveIndustry.bind(null, industry.slug)} site={site} />;
}
