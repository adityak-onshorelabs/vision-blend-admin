"use client";

import { useState } from "react";
import type { Hero } from "@/lib/cms/schema";
import { LIMITS } from "@/lib/cms/schema";
import { saveHero } from "../../actions";
import { ActionForm, Field } from "../../_components/form";

export function HeroForm({ hero }: { hero: Hero }) {
  const [v, setV] = useState(hero);
  const words = v.tagline.replace(/\.$/, "").trim().split(/\s+/);
  const last = words.pop();

  return (
    <div className="grid gap-10">
      {/* Small preview of the centred hero on the copper */}
      <figure className="grid gap-2">
        <div className="relative grid aspect-[16/9] place-items-center overflow-hidden bg-night bg-[url('/images/hero-copper.jpg')] bg-cover bg-center px-6 text-center text-[var(--on-night)]">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_48%,rgba(20,12,8,0.5),rgba(20,12,8,0.2)_70%,transparent)]" />
          <div className="relative grid max-w-[30rem] justify-items-center gap-3">
            <span className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-[var(--brand-soft)]">{v.eyebrow || " "}</span>
            <span className="max-w-[7.6em] text-[clamp(1.6rem,4.4vw,2.6rem)] font-light leading-[0.95] tracking-[-0.045em] [text-wrap:balance]">
              {words.join(" ")} <span className="text-[var(--brand-soft)]">{last}</span>
              <span className="text-[var(--brand-soft)]">.</span>
            </span>
            <span className="max-w-[34ch] text-[0.78rem] leading-snug text-[var(--on-night)]/90">{v.lead}</span>
          </div>
        </div>
        <figcaption className="text-[0.84rem] text-muted-foreground">Preview. The last word of the tagline is shown in brown.</figcaption>
      </figure>

      <ActionForm action={saveHero} submit="Save hero">
        <Field name="eyebrow" label="Label above the tagline" max={LIMITS.eyebrow} defaultValue={hero.eyebrow} onValue={(eyebrow) => setV((s) => ({ ...s, eyebrow }))} hint="Short and factual, e.g. Marketing studio · Est. 2023" />
        <Field name="tagline" label="Tagline" max={LIMITS.tagline} defaultValue={hero.tagline} onValue={(tagline) => setV((s) => ({ ...s, tagline }))} hint="2 to 6 words, no full stop (the brand dot is added for you)" />
        <Field name="lead" label="Intro line" max={LIMITS.lead} defaultValue={hero.lead} multiline rows={3} onValue={(lead) => setV((s) => ({ ...s, lead }))} hint="One or two sentences under the tagline" />
      </ActionForm>
    </div>
  );
}
