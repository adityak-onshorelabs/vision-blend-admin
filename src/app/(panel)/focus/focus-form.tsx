"use client";

import { useState } from "react";
import { LIMITS, type CmsFocus } from "@/lib/cms/schema";
import { deleteFocus, saveFocus } from "../../actions";
import { ActionForm, Check, Field, FieldError } from "../../_components/form";

export function FocusForm({ feature, index }: { feature: CmsFocus | null; index: number | null }) {
  return (
    <ActionForm action={saveFocus} submit={feature ? "Save feature" : "Add feature"}>
      <input type="hidden" name="original" value={index ?? ""} />
      <input type="hidden" name="originalLabel" value={feature?.label ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="label" label="Label" max={LIMITS.focusLabel} defaultValue={feature?.label ?? "Employee of the Month"} placeholder="Employee of the Month" />
        <Field name="name" label="Name" max={LIMITS.focusName} defaultValue={feature?.name} placeholder="Sheena Dave" />
        <Field name="date" label="Date (optional)" max={LIMITS.focusDate} defaultValue={feature?.date} placeholder="October 2026" />
      </div>
      <Field name="caption" label="Caption (optional)" max={LIMITS.focusCaption} defaultValue={feature?.caption} multiline rows={3} placeholder="One or two lines on why they're featured." />
      <div className="grid gap-4">
        <span className="t-label">Photo</span>
        {feature?.photo && (
          <div className="grid gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file */}
            <img src={feature.photo} alt="" className="aspect-[4/5] w-full max-w-[160px] object-cover" />
            <Check name="removePhoto" label="Remove this photo" />
          </div>
        )}
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="text-[0.92rem] file:me-4 file:cursor-pointer file:border file:border-ink file:bg-transparent file:px-4 file:py-2 file:text-[0.88rem]" />
        <FieldError name="photo" />
        <p className="text-[0.84rem] text-muted-foreground">Cropped to 4:5 on the site. JPG, PNG or WebP, under 4.4 MB.</p>
      </div>
    </ActionForm>
  );
}

export function DeleteFocus({ index, label }: { index: number; label: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <form action={deleteFocus} className="flex items-center gap-2">
      <input type="hidden" name="index" value={index} />
      <input type="hidden" name="label" value={label} />
      {armed ? (
        <>
          <button type="submit" className="cta cta-sm border-[var(--error)] bg-[var(--error)]">Remove</button>
          <button type="button" className="u text-[0.86rem]" onClick={() => setArmed(false)}>Keep</button>
        </>
      ) : (
        <button type="button" className="cta cta-line cta-sm" onClick={() => setArmed(true)} aria-label={`Remove ${label}`}>
          Remove
        </button>
      )}
    </form>
  );
}
