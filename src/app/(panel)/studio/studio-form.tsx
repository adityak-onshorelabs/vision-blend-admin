"use client";

import { LIMITS, type Studio } from "@/lib/cms/schema";
import { saveStudio } from "../../actions";
import { ActionForm, Field } from "../../_components/form";

export function StudioForm({ studio }: { studio: Studio }) {
  return (
    <ActionForm action={saveStudio} submit="Save details">
      <section className="grid gap-5">
        <h2 className="t-label marker">Email</h2>
        <Field name="email" label="Studio email" type="email" defaultValue={studio.email} hint="Briefs go here. Shown on the Contact page and used by every Send us a message link." />
        <Field name="emailCc" label="Also send briefs to (optional)" type="email" defaultValue={studio.emailCc ?? ""} hint="Copied on every new brief" />
      </section>
      <section className="grid gap-5">
        <h2 className="t-label marker">Phone (optional)</h2>
        <p className="-mt-2 text-[0.92rem] text-muted-foreground">Up to two numbers, each with the name of the person who answers. Shown on the Contact page and the home page, tap to call. Leave a row empty to hide it.</p>
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Field name={`phones.${i}.name`} label="Name" max={LIMITS.phoneName} defaultValue={studio.phones[i]?.name} placeholder="Aquib" />
            <Field name={`phones.${i}.number`} label="Number" type="tel" defaultValue={studio.phones[i]?.number} placeholder="+91 98765 43210" />
          </div>
        ))}
      </section>
      <section className="grid gap-5">
        <h2 className="t-label marker">Studio</h2>
        <Field name="location" label="City (optional)" max={LIMITS.location} defaultValue={studio.location ?? ""} placeholder="Mumbai" hint="Shown beside the contact details. Leave empty to hide it." />
      </section>
    </ActionForm>
  );
}
