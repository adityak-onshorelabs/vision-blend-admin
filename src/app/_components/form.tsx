"use client";

import { createContext, useActionState, useContext, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "../actions";
import { cn } from "@/lib/utils";

const ErrorsContext = createContext<Record<string, string>>({});

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

/** A form bound to a Server Action: inline field errors, a status line, a pending submit button. */
export function ActionForm({ action, submit, children, className }: { action: Action; submit: string; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <ErrorsContext.Provider value={state.errors ?? {}}>
      <form action={formAction} noValidate className={cn("grid gap-7", className)}>
        {children}
        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
          <Submit label={submit} />
          {state.message && (
            <p role={state.ok ? "status" : "alert"} className={cn("text-[0.92rem]", state.ok ? "text-brand" : "text-destructive")}>
              {state.message}
            </p>
          )}
        </div>
      </form>
    </ErrorsContext.Provider>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="cta" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

type FieldProps = {
  name: string;
  label: string;
  defaultValue?: string | number;
  max?: number;
  multiline?: boolean;
  rows?: number;
  type?: string;
  hint?: string;
  placeholder?: string;
  onValue?: (v: string) => void;
};

/** Text field with a live character count; past max the browser stops typing (maxLength). */
export function Field({ name, label, defaultValue = "", max, multiline, rows = 3, type = "text", hint, placeholder, onValue }: FieldProps) {
  const errors = useContext(ErrorsContext);
  const error = errors[name];
  const [length, setLength] = useState(String(defaultValue).length);
  const near = max !== undefined && length >= max * 0.9;
  const props = {
    id: `f-${name}`,
    name,
    defaultValue,
    maxLength: max,
    placeholder,
    className: "field-input",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `f-${name}-note` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setLength(e.target.value.length);
      onValue?.(e.target.value);
    },
  };
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={props.id} className="t-label">
          {label}
        </label>
        {max !== undefined && (
          <span className={cn("text-[0.78rem] tabular-nums", near ? "text-brand" : "text-[var(--faint)]")} aria-live="polite">
            {length}/{max}
          </span>
        )}
      </div>
      {multiline ? <textarea rows={rows} {...props} /> : <input type={type} {...props} />}
      {(error || hint) && (
        <span id={`f-${name}-note`} className={cn("text-[0.84rem]", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

export function Check({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-[0.98rem]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1.5 size-4 accent-[var(--brand)]" />
      <span className="grid gap-0.5">
        {label}
        {hint && <span className="text-[0.84rem] text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function Select({ name, label, defaultValue, options, hint }: { name: string; label: string; defaultValue?: string; options: [string, string][]; hint?: string }) {
  const errors = useContext(ErrorsContext);
  return (
    <div className="grid gap-1.5">
      <label htmlFor={`f-${name}`} className="t-label">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue} className="field-input">
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {(errors[name] || hint) && <span className={cn("text-[0.84rem]", errors[name] ? "text-destructive" : "text-muted-foreground")}>{errors[name] ?? hint}</span>}
    </div>
  );
}

/** Field-level error for inputs that aren't text (file uploads, whole-form errors). */
export function FieldError({ name }: { name: string }) {
  const error = useContext(ErrorsContext)[name];
  return error ? <span className="text-[0.84rem] text-destructive">{error}</span> : null;
}
