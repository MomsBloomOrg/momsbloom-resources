"use client";

import { upload } from "@vercel/blob/client";
import { startTransition, useActionState, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { DocumentFormOptions, DocumentInput } from "@/admin/documents";
import { validatePdfUpload } from "@/admin/document-upload";
import { Field, Notice, buttonClass, hintClass, inputClass, labelClass } from "../../_components/ui";
import { Checks } from "../../programs/_components/program-form";
import { saveDocumentAction, type DocumentFormState } from "../actions";

const IDLE: DocumentFormState = { status: "idle" };
const checkRowClass = "flex min-h-9 items-center gap-2";

/**
 * The Document form. `document` is empty on the "new" page. Submitted with `onSubmit`, not
 * `<form action>`: React 19 would reset the fields after the action, and a refused save would lose
 * the text.
 */
export function DocumentForm({
  id,
  document,
  options,
  uploadPrefix,
}: {
  id?: number;
  document?: DocumentInput;
  options: DocumentFormOptions;
  uploadPrefix: string;
}) {
  const [state, dispatch, pending] = useActionState(saveDocumentAction, IDLE);
  const [categoryIds, setCategoryIds] = useState<number[]>(document?.categoryIds ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const urlInput = useRef<HTMLInputElement>(null);
  const errors = state.status === "invalid" ? state.errors : {};
  const d = document;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }

  async function onPdfSelected(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadMessage("");
    setUploadProgress(0);

    const error = validatePdfUpload(file);
    if (error) {
      setUploadError(error);
      input.value = "";
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(`${uploadPrefix}${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/blob-upload",
        onUploadProgress: ({ percentage }) => setUploadProgress(Math.round(percentage)),
      });
      if (urlInput.current) urlInput.current.value = blob.url;
      // shortcut: Uploading a replacement intentionally leaves the old Blob in place; cleanup is a follow-up.
      setUploadMessage("Upload complete. Save the Document to keep this PDF.");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The PDF could not be uploaded.");
      input.value = "";
    } finally {
      setUploading(false);
    }
  }

  const describedBy = (name: string, hint?: string) =>
    [hint && `document-${name}-hint`, errors[name] && `document-${name}-error`].filter(Boolean).join(" ") || undefined;

  const text = (name: "title" | "searchKeywords" | "url", label: string, extra: { hint?: string; type?: string } = {}) => (
    <Field id={`document-${name}`} label={label} hint={extra.hint} error={errors[name]}>
      <input
        id={`document-${name}`}
        name={name}
        type={extra.type ?? "text"}
        ref={name === "url" ? urlInput : undefined}
        defaultValue={d?.[name] ?? ""}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={describedBy(name, extra.hint)}
        className={inputClass}
      />
    </Field>
  );

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id ?? ""} />
      {text("title", "Title")}
      <Field id="document-description" label="Description" error={errors.description}>
        <textarea id="document-description" name="description" rows={3} defaultValue={d?.description ?? ""} className={inputClass} />
      </Field>
      {text("searchKeywords", "Search keywords", {
        hint: "Words a parent might type that are not in the title or description.",
      })}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("url", "PDF link", { type: "url", hint: "The full web address of the PDF, starting with https://" })}
        <Field id="document-pdf-upload" label="Upload PDF" hint="PDF only, up to 20 MB. The uploaded URL will fill the PDF link field.">
          <input
            id="document-pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={onPdfSelected}
            disabled={uploading}
            className={inputClass}
          />
        </Field>
      </div>
      {uploading && (
        <p role="status" aria-live="polite" className={hintClass}>
          Uploading PDF: {uploadProgress}%
        </p>
      )}
      {!uploading && uploadMessage && (
        <p role="status" aria-live="polite" className={hintClass}>
          {uploadMessage}
        </p>
      )}
      {uploadError && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {uploadError}
        </p>
      )}

      <fieldset className="flex flex-col gap-1" aria-describedby={errors.categoryIds || errors.subcategoryIds ? "categories-error" : undefined}>
        <legend className={labelClass}>Categories</legend>
        <p className={hintClass}>Subcategories show under each checked Category.</p>
        {options.categories.map((c) => {
          const on = categoryIds.includes(c.id);
          const subs = options.subcategories.filter((s) => s.categoryId === c.id);
          return (
            <div key={c.id}>
              <label className={checkRowClass}>
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={c.id}
                  checked={on}
                  onChange={(e) => setCategoryIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id)))}
                />
                <span className="font-semibold">{c.name}</span>
              </label>
              {on && subs.length > 0 && (
                <div className="ml-7 grid gap-x-4 sm:grid-cols-2" role="group" aria-label={`Subcategories of ${c.name}`}>
                  {subs.map((s) => (
                    <label key={s.id} className={checkRowClass}>
                      <input type="checkbox" name="subcategoryIds" value={s.id} defaultChecked={d?.subcategoryIds.includes(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {(errors.categoryIds || errors.subcategoryIds) && (
          <p id="categories-error" role="alert" className="text-sm font-semibold text-red-700">
            {errors.categoryIds ?? errors.subcategoryIds}
          </p>
        )}
      </fieldset>

      <Checks name="languageIds" legend="Languages" options={options.languages} checked={d?.languageIds ?? []} error={errors.languageIds} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="document-statusId" label="Status" error={errors.statusId}>
          <select id="document-statusId" name="statusId" defaultValue={String(d?.statusId ?? options.statuses[0]?.id ?? "")} className={inputClass}>
            {options.statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.showOnSite ? "" : " (hidden from families)"}
              </option>
            ))}
          </select>
        </Field>
        <Field id="document-lastVerified" label="Last verified" error={errors.lastVerified}>
          <input id="document-lastVerified" name="lastVerified" type="date" defaultValue={d?.lastVerified ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field id="document-internalNotes" label="Internal notes" hint="Not shown on the website." error={errors.internalNotes}>
        <textarea
          id="document-internalNotes"
          name="internalNotes"
          rows={3}
          defaultValue={d?.internalNotes ?? ""}
          aria-describedby="document-internalNotes-hint"
          className={inputClass}
        />
      </Field>

      {state.status === "saved" && <Notice tone="success" role="status">{state.message}</Notice>}
      {state.status === "invalid" && <Notice tone="error" role="alert">{state.message}</Notice>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending || uploading} className={buttonClass("primary")}>
          {id === undefined ? "Create Document" : "Save"}
        </button>
      </div>
    </form>
  );
}
