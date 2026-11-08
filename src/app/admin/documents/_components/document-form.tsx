"use client";

import { upload } from "@vercel/blob/client";
import { startTransition, useActionState, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type { DocumentFormOptions, DocumentInput } from "@/admin/documents";
import { validatePdfUpload } from "@/admin/document-upload";
import type { CustomFieldDefinition } from "@/custom-fields/types";
import { CustomFieldInputs } from "../../_components/custom-field-inputs";
import { Card, Field, Notice, PageHeader, buttonClass, hintClass, inputClass, sectionTitle, statusPillClass } from "../../_components/ui";
import { ChipSelect, type ChipOption } from "../../programs/_components/program-form";
import { saveDocumentAction, type DocumentFormState } from "../actions";

const IDLE: DocumentFormState = { status: "idle" };
// Must match the id lists of DocumentInput: a list missing here silently drops its saved checks.
const CHIP_LISTS = ["categoryIds", "subcategoryIds", "languageIds"] as const;

/**
 * The Document form. `document` is empty on the "new" page. Submitted with `onSubmit`, not
 * `<form action>`: React 19 would reset the fields after the action, and a refused save would lose
 * the text.
 */
export function DocumentForm({
  id,
  document,
  options,
  customFields,
  canManageFields = false,
  uploadPrefix,
  title,
  back,
  actions,
  children,
}: {
  id?: number;
  document?: DocumentInput;
  options: DocumentFormOptions;
  /** The active Document custom fields, in order. */
  customFields: readonly CustomFieldDefinition[];
  /** Owners get a link to the Custom fields page; editors do not. */
  canManageFields?: boolean;
  uploadPrefix: string;
  title: string;
  back?: ReactNode;
  /** Header actions before the Status select, for example "Open PDF". */
  actions?: ReactNode;
  /** The end of the Admin card, for example "Last changed". */
  children?: ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(saveDocumentAction, IDLE);
  // Every chip checkbox, as `name:id`. Kept while a Subcategory is not rendered, so a Category off/on brings its checks back.
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(CHIP_LISTS.flatMap((name) => (document?.[name] ?? []).map((v) => `${name}:${v}`))),
  );
  const onToggle = (key: string, on: boolean) =>
    setChecked((old) => {
      const next = new Set(old);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const urlInput = useRef<HTMLInputElement>(null);
  const errors = state.status === "invalid" ? state.errors : {};
  const d = document;
  const lastVerified = state.status === "saved" && state.lastVerified ? state.lastVerified : (d?.lastVerified ?? "");
  const verifiedBy = state.status === "saved" && state.lastVerifiedBy !== undefined ? state.lastVerifiedBy : d?.lastVerifiedBy;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    // The button that was clicked, so `intent=verify` reaches the action.
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
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

  // A Subcategory is listed (and sent) only while its Category is checked.
  const categoryOptions = options.categories.flatMap((c): ChipOption[] => [
    { name: "categoryIds", id: c.id, label: c.name },
    ...(checked.has(`categoryIds:${c.id}`)
      ? options.subcategories.filter((s) => s.categoryId === c.id).map((s) => ({ name: "subcategoryIds", id: s.id, label: s.name, indent: true }))
      : []),
  ]);
  const languageOptions: ChipOption[] = options.languages.map((l) => ({ name: "languageIds", id: l.id, label: l.name }));
  const saveLabel = id === undefined ? "Create Document" : "Save Changes";
  /** The save result. `live` gives the boxes their roles; the copy by the bottom Save has none, so a screen reader reads it once. */
  const notices = (live: boolean) => (
    <>
      {state.status === "saved" && <Notice tone="success" role={live ? "status" : undefined}>{state.message}</Notice>}
      {state.status === "invalid" && <Notice tone="error" role={live ? "alert" : undefined}>{state.message}</Notice>}
    </>
  );

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={id ?? ""} />
      <div>
        <PageHeader
          title={title}
          back={back}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {actions}
              <label htmlFor="document-statusId" className="sr-only">
                Status
              </label>
              <select
                id="document-statusId"
                name="statusId"
                defaultValue={String(d?.statusId ?? options.statuses[0]?.id ?? "")}
                aria-describedby={errors.statusId ? "document-statusId-error" : undefined}
                className={statusPillClass}
              >
                {options.statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.showOnSite ? "" : " (hidden from families)"}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={pending || uploading} className={buttonClass("primary")}>
                {saveLabel}
              </button>
            </div>
          }
        />
        {errors.statusId && (
          <p id="document-statusId-error" role="alert" className="mb-4 text-sm font-semibold text-red-700">
            {errors.statusId}
          </p>
        )}
        <div className="flex flex-col gap-3">{notices(true)}</div>
      </div>

      <Card title={sectionTitle("Title")}>
        <div className="flex flex-col gap-5">
          {text("title", "Title")}
          <Field id="document-organizationId" label="Organization" hint="Optional. The guide also shows on this Organization's page. Shows on the Organization's page only while the Organization is shown." error={errors.organizationId}>
            <select
              id="document-organizationId"
              name="organizationId"
              defaultValue={String(d?.organizationId ?? "")}
              aria-describedby={describedBy("organizationId", "hint")}
              className={inputClass}
            >
              <option value="">None</option>
              {options.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </Field>
          <ChipSelect
            id="document-categories"
            legend="Categories"
            hint="Subcategories show under each checked Category."
            options={categoryOptions}
            checked={checked}
            onToggle={onToggle}
            error={errors.categoryIds ?? errors.subcategoryIds}
          />
        </div>
      </Card>

      <Card title={sectionTitle("PDF")}>
        <div className="flex flex-col gap-5">
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
        </div>
      </Card>

      <Card title={sectionTitle("About")}>
        <div className="flex flex-col gap-5">
          <Field id="document-description" label="Description" error={errors.description}>
            <textarea id="document-description" name="description" rows={6} defaultValue={d?.description ?? ""} className={inputClass} />
          </Field>
          {text("searchKeywords", "Search keywords", {
            hint: "Words a parent might type that are not in the title or description.",
          })}
        </div>
      </Card>

      <Card title={sectionTitle("Languages")}>
        <div className="flex flex-col gap-5">
          <ChipSelect id="document-languageIds" legend="Languages" options={languageOptions} checked={checked} onToggle={onToggle} error={errors.languageIds} />
        </div>
      </Card>

      <Card title={sectionTitle("Admin")}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-3">
            <Field id="document-lastVerified" label="Last verified" hint={verifiedBy ? `Verified by ${verifiedBy}` : undefined} error={errors.lastVerified}>
              {/* key: a new value from "Mark verified" replaces what the input shows. */}
              <input key={lastVerified} id="document-lastVerified" name="lastVerified" aria-describedby={verifiedBy ? "document-lastVerified-hint" : undefined} type="date" defaultValue={lastVerified} className={inputClass} />
            </Field>
            {id !== undefined && (
              <button type="submit" name="intent" value="verify" disabled={pending || uploading} className={buttonClass("secondary")}>
                Mark verified
              </button>
            )}
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
          <CustomFieldInputs idPrefix="document" fields={customFields} values={d?.custom ?? {}} errors={errors} manageHref={canManageFields ? "/admin/settings/custom-fields#document-fields" : undefined} />
          {children}
        </div>
      </Card>

      <div aria-hidden="true" className="flex flex-col gap-3">
        {notices(false)}
      </div>
      <button type="submit" disabled={pending || uploading} className={`${buttonClass("primary")} w-full max-w-sm self-center`}>
        {saveLabel}
      </button>
    </form>
  );
}
