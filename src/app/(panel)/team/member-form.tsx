"use client";

import { useState } from "react";
import { LIMITS, type CmsMember } from "@/lib/cms/schema";
import { deleteMember, saveMember } from "../../actions";
import { ActionForm, Check, Field, FieldError } from "../../_components/form";

export function MemberForm({ member, index }: { member: CmsMember | null; index: number | null }) {
  return (
    <ActionForm action={saveMember} submit={member ? "Save person" : "Add person"}>
      <input type="hidden" name="original" value={index ?? ""} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Name" max={LIMITS.memberName} defaultValue={member?.name} />
        <Field name="role" label="Role" max={LIMITS.memberRole} defaultValue={member?.role} placeholder="Head of production" />
      </div>
      <div className="grid gap-4">
        <span className="t-label">Photo (optional)</span>
        {member?.photo && (
          <div className="grid gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded file */}
            <img src={member.photo} alt="" className="aspect-[4/5] w-full max-w-[160px] object-cover" />
            <Check name="removePhoto" label="Remove this photo" />
          </div>
        )}
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" className="text-[0.92rem] file:me-4 file:cursor-pointer file:border file:border-ink file:bg-transparent file:px-4 file:py-2 file:text-[0.88rem]" />
        <FieldError name="photo" />
        <p className="text-[0.84rem] text-muted-foreground">A portrait, cropped to 4:5 on the site. JPG, PNG or WebP, under 4 MB.</p>
      </div>
    </ActionForm>
  );
}

export function DeleteMember({ index, name }: { index: number; name: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <form action={deleteMember} className="flex items-center gap-2">
      <input type="hidden" name="index" value={index} />
      {armed ? (
        <>
          <button type="submit" className="cta cta-sm border-[var(--error)] bg-[var(--error)]">Remove</button>
          <button type="button" className="u text-[0.86rem]" onClick={() => setArmed(false)}>Keep</button>
        </>
      ) : (
        <button type="button" className="cta cta-line cta-sm" onClick={() => setArmed(true)} aria-label={`Remove ${name}`}>
          Remove
        </button>
      )}
    </form>
  );
}
