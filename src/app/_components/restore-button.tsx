"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { restoreRevision, type FormState } from "../actions";

/** Two steps, so a stray click never replaces live content: Restore, then Yes, restore */
export function RestoreButton({ id, label }: { id: number; label: string }) {
  const [armed, setArmed] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(restoreRevision, {});
  return (
    <form action={action} className="grid justify-items-start gap-2">
      <input type="hidden" name="id" value={id} />
      {armed ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[0.9rem]">Put this version live on the site?</span>
          <Confirm />
          <button type="button" className="u text-[0.86rem]" onClick={() => setArmed(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="cta cta-line cta-sm" onClick={() => setArmed(true)} aria-label={label}>
          Restore this version
        </button>
      )}
      {state.message && (
        <p role="alert" className="text-[0.88rem] text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="cta cta-sm" disabled={pending}>
      {pending ? "Restoring…" : "Yes, restore"}
    </button>
  );
}
