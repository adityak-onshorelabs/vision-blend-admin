"use client";

import { useState } from "react";
import type { Studio } from "@/lib/cms/schema";
import { teamLine } from "@/lib/cms/team";
import { saveStudio } from "../../actions";
import { ActionForm, Field } from "../../_components/form";

export function StudioForm({ studio }: { studio: Studio }) {
  const [size, setSize] = useState(String(studio.teamSize));
  const n = Number(size);

  return (
    <ActionForm action={saveStudio} submit="Save details">
      <section className="grid gap-5">
        <h2 className="t-label marker">Team</h2>
        <div className="grid gap-2 sm:max-w-[50%]">
          <Field name="teamSize" label="Number of people in the team" type="number" defaultValue={studio.teamSize} onValue={setSize} />
          <p className="text-[0.92rem] text-muted-foreground">
            Shown on the site as <span className="text-ink">{Number.isInteger(n) && n > 0 && n < 100 ? teamLine(n) : "…"}</span>
          </p>
        </div>
      </section>
      <section className="grid gap-5">
        <h2 className="t-label marker">Contact</h2>
        <Field name="email" label="Studio email" type="email" defaultValue={studio.email} hint="Briefs go here. Shown on the Contact page and used by every Send us a message link." />
        <Field name="emailCc" label="Also send briefs to (optional)" type="email" defaultValue={studio.emailCc ?? ""} hint="Copied on every new brief" />
        <Field name="phone" label="Phone (optional)" type="tel" defaultValue={studio.phone ?? ""} placeholder="+91 98765 43210" hint="Shown on the Contact page and the home page, tap to call" />
      </section>
    </ActionForm>
  );
}
