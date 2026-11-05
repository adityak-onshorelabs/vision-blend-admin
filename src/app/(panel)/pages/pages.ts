import type { PageKey } from "@/lib/cms/schema";

/** The page-copy screens, in site order. Kept apart from the client spec so server pages can list them. */
export const PAGES: { key: PageKey; label: string; path: string; text: string }[] = [
  { key: "home", label: "Home", path: "/en", text: "Showreel, section headings, beliefs and process steps. The hero's words are on the Hero screen." },
  { key: "about", label: "About", path: "/en/about", text: "The studio's story, the team intro and the note for creatives." },
  { key: "workPage", label: "Work", path: "/en/work", text: "Headings and text around the projects." },
  { key: "industriesPage", label: "Industries", path: "/en/industries", text: "The title and intro above the industry cards." },
  { key: "contactPage", label: "Contact", path: "/en/contact", text: "The headings, next steps and links around the enquiry form." },
];
