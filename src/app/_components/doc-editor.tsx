"use client";

/*
  One editor for long, nested documents (an industry page, a page's copy). A spec lists the fields;
  the editor keeps the whole record in state, so fields the spec leaves out (a link target, a
  crop) are sent back untouched. Saving posts the record as JSON to a Server Action, which
  validates it with the same schema as the site and answers with errors keyed by path
  ("detail.offerings.2.title"), shown on the field they belong to.

  Images and films upload the moment they are picked (uploadMedia), so a save only sends text.
*/

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { driveId } from "@/lib/cms/schema";
import { cn } from "@/lib/utils";
import { uploadMedia, type FormState } from "../actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents are validated on save; the editor walks them by path
type Json = any;
type Path = (string | number)[];

type Base = { key: string; label: string; hint?: string };
export type FieldSpec =
  | (Base & { kind: "text"; max: number; rows?: number; placeholder?: string })
  | (Base & { kind: "strings"; max: number; rows?: number; item: string; limit?: number })
  | (Base & { kind: "photo"; folder: string })
  | (Base & { kind: "media"; accept: "image" | "video"; folder: string; optional?: boolean })
  | (Base & { kind: "drive" })
  | (Base & { kind: "folder" })
  | (Base & { kind: "url"; placeholder?: string })
  | (Base & { kind: "ratio" })
  | (Base & { kind: "select"; options: [string, string][] })
  | (Base & { kind: "group"; fields: FieldSpec[]; optional?: () => Json })
  | (Base & { kind: "list"; fields: FieldSpec[]; title: (item: Json, i: number) => string; empty?: () => Json; limit?: number });

/** `at`: the fields live under this key of the record (e.g. "detail") */
export type SectionSpec = { title: string; hint?: string; at?: string; fields: FieldSpec[] };

type Ctx = { errors: Record<string, string>; site: string; set: (path: Path, v: Json) => void };

const STARS = "Wrap a word in *stars* to show it in brown.";
export const hintStars = (extra?: string) => (extra ? `${extra} ${STARS}` : STARS);

/* Path helpers */

function getAt(obj: Json, path: Path): Json {
  return path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setAt(obj: Json, path: Path, value: Json): Json {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj ?? {}) };
  const next = setAt(copy[k], rest, value);
  if (next === undefined && !Array.isArray(copy)) delete copy[k];
  else copy[k] = next;
  return copy;
}
const id = (path: Path) => `f-${path.join("-")}`;
const errorsUnder = (errors: Record<string, string>, path: Path) => {
  const p = path.join(".");
  return Object.keys(errors).some((k) => k === p || k.startsWith(`${p}.`));
};
/** A site path ("/images/x.jpg") is shown from the public site */
const abs = (site: string, src: string) => (src.startsWith("/") ? `${site}${src}` : src);

/* The editor */

export function DocEditor({
  value: initial,
  sections,
  action,
  site,
  submit = "Save changes",
}: {
  value: Json;
  sections: SectionSpec[];
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  site: string;
  submit?: string;
}) {
  const [value, setValue] = useState<Json>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [state, formAction] = useActionState(action, {});
  const errors = useMemo(() => state.errors ?? {}, [state.errors]);
  const json = JSON.stringify(value);
  const dirty = json !== saved;
  const sent = useRef(json);

  // After a successful save, what was sent is the new baseline
  useEffect(() => {
    if (state.ok) setSaved(sent.current);
  }, [state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const ctx: Ctx = { errors, site, set: (path, v) => setValue((s: Json) => setAt(s, path, v)) };

  return (
    <form
      action={formAction}
      onSubmit={() => {
        sent.current = json;
      }}
      noValidate
      className="grid gap-4"
    >
      <input type="hidden" name="data" value={json} />
      {sections.map((section, i) => {
        const base = section.at ? [section.at] : [];
        const bad = section.fields.some((f) => errorsUnder(errors, [...base, f.key]));
        return (
          <details key={section.title} open={i === 0 || bad || undefined} className="group border-t border-border pt-4">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-1 [&::-webkit-details-marker]:hidden">
              <span className="grid gap-1">
                <span className={cn("t-label marker", bad && "!text-destructive")}>{section.title}</span>
                {section.hint && <span className="text-[0.88rem] text-muted-foreground">{section.hint}</span>}
              </span>
              <span aria-hidden="true" className="text-[var(--faint)] transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="grid gap-6 pb-6 pt-5">
              {section.fields.map((f) => (
                <FieldView key={f.key} spec={f} path={[...base, f.key]} value={getAt(value, [...base, f.key])} ctx={ctx} />
              ))}
            </div>
          </details>
        );
      })}

      <div className="sticky bottom-0 z-10 -mx-5 flex flex-wrap items-center gap-4 border-t border-border bg-paper/95 px-5 py-4 backdrop-blur sm:-mx-10 sm:px-10">
        <Submit label={submit} />
        {state.message && !dirty ? (
          <p role={state.ok ? "status" : "alert"} className={cn("text-[0.92rem]", state.ok ? "text-brand" : "text-destructive")}>
            {state.message}
          </p>
        ) : state.message && !state.ok ? (
          <p role="alert" className="text-[0.92rem] text-destructive">{state.message}</p>
        ) : (
          dirty && <p className="text-[0.92rem] text-muted-foreground">Unsaved changes</p>
        )}
      </div>
    </form>
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

/* Fields */

function Note({ path, hint, errors }: { path: Path; hint?: string; errors: Record<string, string> }) {
  const error = errors[path.join(".")];
  if (!error && !hint) return null;
  return (
    <span id={`${id(path)}-note`} className={cn("text-[0.84rem]", error ? "text-destructive" : "text-muted-foreground")}>
      {error ?? hint}
    </span>
  );
}

function Label({ path, label, count, max }: { path: Path; label: string; count?: number; max?: number }) {
  const near = max !== undefined && count !== undefined && count >= max * 0.9;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <label htmlFor={id(path)} className="t-label">
        {label}
      </label>
      {max !== undefined && (
        <span className={cn("text-[0.78rem] tabular-nums", near ? "text-brand" : "text-[var(--faint)]")}>
          {count}/{max}
        </span>
      )}
    </div>
  );
}

function TextInput({
  path,
  value,
  ctx,
  max,
  rows,
  placeholder,
  type = "text",
  onBlur,
}: {
  path: Path;
  value: string;
  ctx: Ctx;
  max?: number;
  rows?: number;
  placeholder?: string;
  type?: string;
  onBlur?: (v: string) => void;
}) {
  const props = {
    id: id(path),
    value: value ?? "",
    maxLength: max,
    placeholder,
    className: "field-input",
    "aria-invalid": ctx.errors[path.join(".")] ? true : undefined,
    "aria-describedby": `${id(path)}-note`,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => ctx.set(path, e.target.value),
    onBlur: onBlur && ((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => onBlur(e.target.value)),
  };
  return rows ? <textarea rows={rows} {...props} /> : <input type={type} {...props} />;
}

const btn = "cta cta-line cta-sm disabled:opacity-30";

function FieldView({ spec, path, value, ctx }: { spec: FieldSpec; path: Path; value: Json; ctx: Ctx }): ReactNode {
  switch (spec.kind) {
    case "text":
      return (
        <div className="grid gap-1.5">
          <Label path={path} label={spec.label} count={(value ?? "").length} max={spec.max} />
          <TextInput path={path} value={value} ctx={ctx} max={spec.max} rows={spec.rows} placeholder={spec.placeholder} />
          <Note path={path} hint={spec.hint} errors={ctx.errors} />
        </div>
      );

    case "url":
    case "folder":
      return (
        <div className="grid gap-1.5">
          <Label path={path} label={spec.label} />
          <div className="flex gap-3">
            <TextInput path={path} value={value} ctx={ctx} type="url" placeholder={spec.kind === "folder" ? "https://drive.google.com/drive/folders/…" : "placeholder" in spec ? spec.placeholder : undefined} />
            {value && /^https:\/\//.test(value) && (
              <a href={value} target="_blank" rel="noopener noreferrer" className="u shrink-0 self-center text-[0.9rem]">
                Open ↗
              </a>
            )}
          </div>
          <Note path={path} hint={spec.hint} errors={ctx.errors} />
        </div>
      );

    case "drive": {
      const fileId = value ? driveId(value) : "";
      const valid = /^[\w-]{20,}$/.test(fileId);
      return (
        <div className="grid gap-1.5">
          <Label path={path} label={spec.label} />
          <div className="flex items-start gap-4">
            <div className="grid flex-1 gap-1.5">
              <TextInput path={path} value={value} ctx={ctx} placeholder="https://drive.google.com/file/d/…/view" onBlur={(v) => v && ctx.set(path, driveId(v))} />
              <Note path={path} hint={spec.hint ?? "Paste the file's share link. It must be shared as “Anyone with the link”."} errors={ctx.errors} />
            </div>
            {valid && (
              <a href={`https://drive.google.com/file/d/${fileId}/view`} target="_blank" rel="noopener noreferrer" className="grid shrink-0 gap-1 text-[0.8rem] text-muted-foreground">
                {/* eslint-disable-next-line @next/next/no-img-element -- Drive's own thumbnail, admin preview */}
                <img src={`https://lh3.googleusercontent.com/d/${fileId}=w240`} alt="" className="h-16 w-24 bg-[var(--well)] object-cover" />
                <span className="u">Open ↗</span>
              </a>
            )}
          </div>
        </div>
      );
    }

    case "select":
      return (
        <div className="grid gap-1.5">
          <Label path={path} label={spec.label} />
          <select id={id(path)} value={value ?? spec.options[0][0]} onChange={(e) => ctx.set(path, e.target.value)} className="field-input">
            {spec.options.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
          <Note path={path} hint={spec.hint} errors={ctx.errors} />
        </div>
      );

    case "ratio":
      return <RatioField spec={spec} path={path} value={value} ctx={ctx} />;

    case "media":
      return <MediaField spec={spec} path={path} value={value} ctx={ctx} />;

    case "photo":
      return <PhotoField spec={spec} path={path} value={value} ctx={ctx} />;

    case "strings":
      return <StringsField spec={spec} path={path} value={value ?? []} ctx={ctx} />;

    case "group": {
      if (value === undefined && spec.optional) {
        return (
          <div className="grid gap-1.5">
            <span className="t-label">{spec.label}</span>
            <button type="button" className={cn(btn, "justify-self-start")} onClick={() => ctx.set(path, spec.optional!())}>
              + Add {spec.label.toLowerCase()}
            </button>
            {spec.hint && <span className="text-[0.84rem] text-muted-foreground">{spec.hint}</span>}
          </div>
        );
      }
      return (
        <fieldset className="grid gap-5 border-l-2 border-border ps-5">
          <legend className="mb-3 flex w-full items-baseline justify-between gap-4">
            <span className="t-label">{spec.label}</span>
            {spec.optional && (
              <button type="button" className="u text-[0.86rem] text-muted-foreground" onClick={() => ctx.set(path, undefined)}>
                Remove
              </button>
            )}
          </legend>
          {spec.hint && <p className="-mt-2 text-[0.84rem] text-muted-foreground">{spec.hint}</p>}
          {spec.fields.map((f) => (
            <FieldView key={f.key} spec={f} path={[...path, f.key]} value={value?.[f.key]} ctx={ctx} />
          ))}
        </fieldset>
      );
    }

    case "list":
      return <ListField spec={spec} path={path} value={value ?? []} ctx={ctx} />;
  }
}

function move<T>(list: T[], i: number, j: number) {
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function RowTools({ i, n, onMove, onRemove, label }: { i: number; n: number; onMove: (j: number) => void; onRemove: () => void; label: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button type="button" className={btn} disabled={i === 0} aria-label={`Move ${label} up`} onClick={() => onMove(i - 1)}>
        ↑
      </button>
      <button type="button" className={btn} disabled={i === n - 1} aria-label={`Move ${label} down`} onClick={() => onMove(i + 1)}>
        ↓
      </button>
      <button type="button" className={btn} aria-label={`Remove ${label}`} onClick={onRemove}>
        ✕
      </button>
    </span>
  );
}

function StringsField({ spec, path, value, ctx }: { spec: Extract<FieldSpec, { kind: "strings" }>; path: Path; value: string[]; ctx: Ctx }) {
  return (
    <div className="grid gap-3">
      <span className="t-label">{spec.label}</span>
      {spec.hint && <span className="-mt-2 text-[0.84rem] text-muted-foreground">{spec.hint}</span>}
      {value.map((v, i) => {
        const p = [...path, i];
        return (
          <div key={i} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <label htmlFor={id(p)} className="text-[0.84rem] text-muted-foreground">
                {spec.item} {i + 1}
              </label>
              <span className="flex items-center gap-3">
                <span className="text-[0.78rem] tabular-nums text-[var(--faint)]">
                  {v.length}/{spec.max}
                </span>
                <RowTools i={i} n={value.length} label={`${spec.item} ${i + 1}`} onMove={(j) => ctx.set(path, move(value, i, j))} onRemove={() => ctx.set(path, value.filter((_, k) => k !== i))} />
              </span>
            </div>
            <TextInput path={p} value={v} ctx={ctx} max={spec.max} rows={spec.rows} />
            <Note path={p} errors={ctx.errors} />
          </div>
        );
      })}
      {(spec.limit === undefined || value.length < spec.limit) && (
        <button type="button" className={cn(btn, "justify-self-start")} onClick={() => ctx.set(path, [...value, ""])}>
          + Add {spec.item.toLowerCase()}
        </button>
      )}
      <Note path={path} errors={ctx.errors} />
    </div>
  );
}

function ListField({ spec, path, value, ctx }: { spec: Extract<FieldSpec, { kind: "list" }>; path: Path; value: Json[]; ctx: Ctx }) {
  // Rows added in this session open straight away
  const [opened, setOpened] = useState<number | null>(null);
  return (
    <div className="grid gap-3">
      <span className="t-label">
        {spec.label} <span className="text-[var(--faint)]">({value.length})</span>
      </span>
      {spec.hint && <span className="-mt-2 text-[0.84rem] text-muted-foreground">{spec.hint}</span>}
      <ol className="grid border-t border-border">
        {value.map((item, i) => {
          const p = [...path, i];
          const bad = errorsUnder(ctx.errors, p);
          const title = spec.title(item, i) || "Untitled";
          return (
            <li key={i} className="border-b border-border">
              <details open={opened === i || bad || undefined} className="group/row">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="text-[0.78rem] font-medium tabular-nums text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>
                    <span className={cn("truncate", bad && "text-destructive")}>{title}</span>
                  </span>
                  {spec.empty && (
                    <span onClick={(e) => e.preventDefault()}>
                      <RowTools
                        i={i}
                        n={value.length}
                        label={title}
                        onMove={(j) => {
                          setOpened(null);
                          ctx.set(path, move(value, i, j));
                        }}
                        onRemove={() => {
                          setOpened(null);
                          ctx.set(path, value.filter((_, k) => k !== i));
                        }}
                      />
                    </span>
                  )}
                </summary>
                <div className="grid gap-5 pb-6 ps-7 pt-1">
                  {spec.fields.map((f) => (
                    <FieldView key={f.key} spec={f} path={[...p, f.key]} value={item?.[f.key]} ctx={ctx} />
                  ))}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      {spec.empty && (spec.limit === undefined || value.length < spec.limit) && (
        <button
          type="button"
          className={cn(btn, "justify-self-start")}
          onClick={() => {
            setOpened(value.length);
            ctx.set(path, [...value, spec.empty!()]);
          }}
        >
          + Add
        </button>
      )}
      <Note path={path} errors={ctx.errors} />
    </div>
  );
}

const RATIOS: [string, [number, number]][] = [
  ["16:9", [16, 9]],
  ["9:16 reel", [9, 16]],
  ["4:5", [4, 5]],
  ["1:1", [1, 1]],
  ["3:4", [3, 4]],
  ["Scope 2.35:1", [1692, 720]],
];

function RatioField({ spec, path, value, ctx }: { spec: Extract<FieldSpec, { kind: "ratio" }>; path: Path; value?: [number, number]; ctx: Ctx }) {
  const [w, h] = value ?? ["", ""];
  const set = (i: 0 | 1, v: string) => {
    const next: (number | string)[] = [w, h];
    next[i] = v === "" ? "" : Number(v);
    ctx.set(path, next[0] === "" && next[1] === "" ? undefined : next);
  };
  return (
    <div className="grid gap-1.5">
      <span className="t-label">{spec.label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label={`${spec.label}: width`} type="number" min={1} value={w} onChange={(e) => set(0, e.target.value)} className="field-input !w-24" />
        <span className="text-muted-foreground">×</span>
        <input aria-label={`${spec.label}: height`} type="number" min={1} value={h} onChange={(e) => set(1, e.target.value)} className="field-input !w-24" />
        <span className="flex flex-wrap gap-1.5 ps-2">
          {RATIOS.map(([name, r]) => (
            <button key={name} type="button" className={cn(btn, value && value[0] / value[1] === r[0] / r[1] && "!border-brand !text-brand")} onClick={() => ctx.set(path, r)}>
              {name}
            </button>
          ))}
        </span>
      </div>
      <Note path={path} hint={spec.hint ?? "The piece's own frame, width × height, so it is shown uncropped."} errors={ctx.errors} />
    </div>
  );
}

function useUpload(kind: "image" | "video", folder: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (file: File): Promise<string | null> => {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    fd.set("folder", folder);
    try {
      const res = await uploadMedia(fd);
      if (res.error) setError(res.error);
      return res.url ?? null;
    } catch {
      setError("Upload failed. Check the file is under 4.4 MB and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function UploadButton({ kind, label, busy, onFile }: { kind: "image" | "video"; label: string; busy: boolean; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        accept={kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <button type="button" className={btn} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}

function Preview({ kind, src, site }: { kind: "image" | "video"; src: string; site: string }) {
  const url = abs(site, src);
  return kind === "video" ? (
    <video src={url} muted loop autoPlay playsInline className="max-h-48 w-auto max-w-full bg-[var(--well)]" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded or site file
    <img src={url} alt="" className="max-h-48 w-auto max-w-full bg-[var(--well)] object-contain" />
  );
}

function MediaField({ spec, path, value, ctx }: { spec: Extract<FieldSpec, { kind: "media" }>; path: Path; value?: string; ctx: Ctx }) {
  const up = useUpload(spec.accept, spec.folder);
  return (
    <div className="grid gap-2">
      <Label path={path} label={spec.label} />
      {value && <Preview kind={spec.accept} src={value} site={ctx.site} />}
      <div className="flex flex-wrap items-center gap-2">
        <UploadButton
          kind={spec.accept}
          label={value ? "Replace" : spec.accept === "video" ? "Upload film" : "Upload image"}
          busy={up.busy}
          onFile={async (f) => {
            const url = await up.run(f);
            if (url) ctx.set(path, url);
          }}
        />
        {value && spec.optional && (
          <button type="button" className="u text-[0.86rem] text-muted-foreground" onClick={() => ctx.set(path, undefined)}>
            Remove
          </button>
        )}
      </div>
      <TextInput path={path} value={value ?? ""} ctx={ctx} placeholder="…or paste a link (https://…)" />
      {up.error && <span className="text-[0.84rem] text-destructive">{up.error}</span>}
      <Note path={path} hint={spec.hint} errors={ctx.errors} />
    </div>
  );
}

function PhotoField({ spec, path, value, ctx }: { spec: Extract<FieldSpec, { kind: "photo" }>; path: Path; value?: { src: string; alt: string; placeholder?: boolean }; ctx: Ctx }) {
  const up = useUpload("image", spec.folder);
  const onFile = async (f: File) => {
    const url = await up.run(f);
    // A new upload is the studio's own image, so it loses the placeholder tag
    if (url) ctx.set(path, { alt: value?.alt ?? "", ...value, src: url, placeholder: false });
  };
  return (
    <div className="grid gap-2">
      <span className="t-label">{spec.label}</span>
      {value ? (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <div className="grid content-start gap-2">
            <Preview kind="image" src={value.src} site={ctx.site} />
            <div className="flex flex-wrap items-center gap-2">
              <UploadButton kind="image" label="Replace" busy={up.busy} onFile={onFile} />
              <button type="button" className="u text-[0.86rem] text-muted-foreground" onClick={() => ctx.set(path, undefined)}>
                Remove
              </button>
            </div>
          </div>
          <div className="grid content-start gap-4">
            <div className="grid gap-1.5">
              <Label path={[...path, "alt"]} label="Description (alt text)" count={value.alt.length} max={200} />
              <TextInput path={[...path, "alt"]} value={value.alt} ctx={ctx} max={200} rows={2} />
              <Note path={[...path, "alt"]} hint="What the image shows, for screen readers and search." errors={ctx.errors} />
            </div>
            <label className="flex items-start gap-3 text-[0.94rem]">
              <input type="checkbox" checked={!!value.placeholder} onChange={(e) => ctx.set([...path, "placeholder"], e.target.checked)} className="mt-1 size-4 accent-[var(--brand)]" />
              <span className="grid gap-0.5">
                Stock stand-in
                <span className="text-[0.84rem] text-muted-foreground">Shows a small “placeholder” tag on the site until the studio’s own image is in.</span>
              </span>
            </label>
            <div className="grid gap-1.5">
              <Label path={[...path, "src"]} label="Image link" />
              <TextInput path={[...path, "src"]} value={value.src} ctx={ctx} />
              <Note path={[...path, "src"]} errors={ctx.errors} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <UploadButton kind="image" label="Upload image" busy={up.busy} onFile={onFile} />
        </div>
      )}
      {up.error && <span className="text-[0.84rem] text-destructive">{up.error}</span>}
      <Note path={path} hint={spec.hint} errors={ctx.errors} />
    </div>
  );
}
