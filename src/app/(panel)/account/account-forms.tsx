"use client";

import { useState } from "react";
import { addUser, changePassword, removeUser } from "../../actions";
import { ActionForm, Field, Select } from "../../_components/form";

export function AddEditorForm() {
  return (
    <ActionForm action={addUser} submit="Add editor">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Name" />
        <Field name="email" label="Email" type="email" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="password" label="Temporary password" type="text" hint="At least 10 characters. Share it with them privately; they can change it under Account." />
        <Select
          name="role"
          label="Role"
          defaultValue="editor"
          options={[
            ["editor", "Editor: edits content"],
            ["owner", "Owner: also manages editors"],
          ]}
        />
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changePassword} submit="Change password">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="current" label="Current password" type="password" />
        <Field name="password" label="New password" type="password" hint="At least 10 characters" />
      </div>
    </ActionForm>
  );
}

export function RemoveEditor({ email, name }: { email: string; name: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <form action={removeUser} className="flex items-center gap-2">
      <input type="hidden" name="email" value={email} />
      {armed ? (
        <>
          <button type="submit" className="cta cta-sm border-[var(--error)] bg-[var(--error)]">Remove {name}</button>
          <button type="button" className="u text-[0.86rem]" onClick={() => setArmed(false)}>Keep</button>
        </>
      ) : (
        <button type="button" className="cta cta-line cta-sm" onClick={() => setArmed(true)}>
          Remove
        </button>
      )}
    </form>
  );
}
