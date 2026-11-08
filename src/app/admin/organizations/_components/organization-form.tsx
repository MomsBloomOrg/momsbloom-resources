"use client";

import { NOT_PLACED } from "@/admin/geocode";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { OrganizationInput, StatusOption } from "@/admin/organizations";
import type { CustomFieldDefinition } from "@/custom-fields/types";
import { CustomFieldInputs } from "../../_components/custom-field-inputs";
import { Card, Field, Notice, PageHeader, buttonClass, inputClass, sectionTitle, statusPillClass } from "../../_components/ui";
import { lastGoodPin } from "../../_components/last-good-pin";
import { saveOrganizationAction, type OrganizationFormState } from "../actions";

const IDLE: OrganizationFormState = { status: "idle" };

/**
 * The Organization form. `organization` is empty on the "new" page. The form is submitted with
 * `onSubmit`, not `<form action>`: React 19 would reset the fields after the action, and the staff
 * member would lose the text of a refused save.
 */
export function OrganizationForm({
  id,
  organization,
  statuses,
  hiddenProgramCount,
  customFields,
  title,
  back,
  actions,
  children,
}: {
  id?: number;
  organization?: OrganizationInput;
  statuses: StatusOption[];
  /** Programs that families see now: the ones a hiding Status would remove. */
  hiddenProgramCount: number;
  /** The active Organization custom fields, in order. */
  customFields: readonly CustomFieldDefinition[];
  title: string;
  back?: ReactNode;
  /** Header actions before the Status select, for example "View on site". */
  actions?: ReactNode;
  /** The end of the Admin card, for example "Last changed". */
  children?: ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(saveOrganizationAction, IDLE);
  const [statusId, setStatusId] = useState(String(organization?.statusId ?? statuses[0]?.id ?? ""));
  // The Status of the last good save: the hide warning compares with this, not with the first page load.
  const savedStatus = useRef(String(organization?.statusId ?? ""));
  const submittedStatus = useRef(statusId);
  useEffect(() => {
    if (state.status === "saved") savedStatus.current = submittedStatus.current;
  }, [state]);
  const errors = state.status === "invalid" ? state.errors : {};
  // After a save: the save's notice. Before: an address with no pin (a create redirects, so it lands here).
  const notice = state.status === "saved" ? state.notice : organization?.streetAddress && organization.latitude == null && organization.longitude == null ? NOT_PLACED : undefined;
  const o = organization;
  // The pin of the last good save, kept across a refused save. The inputs are keyed on it, so a later Save does not send the old pin.
  const [pin, setPin] = useState({ latitude: o?.latitude, longitude: o?.longitude });
  const next = lastGoodPin(pin, state);
  if (next !== pin) setPin(next);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The button that was clicked, so `intent=verify` reaches the action.
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    if (data.get("intent") !== "verify" && id !== undefined && savedStatus.current !== statusId) {
      const target = statuses.find((s) => String(s.id) === statusId);
      if (target && !target.showOnSite && hiddenProgramCount > 0) {
        const n = `${hiddenProgramCount} Program${hiddenProgramCount === 1 ? "" : "s"}`;
        if (!window.confirm(`This hides its ${n} from families. Save anyway?`)) return;
      }
    }
    submittedStatus.current = statusId;
    startTransition(() => dispatch(data));
  }

  const text = (name: keyof OrganizationInput, label: string, extra: { hint?: string; type?: string; inputMode?: "decimal" } = {}) => {
    const fromPin = name === "latitude" || name === "longitude";
    return (
    <Field id={`org-${name}`} label={label} hint={extra.hint} error={errors[name]}>
      <input
        id={`org-${name}`}
        name={name}
        type={extra.type ?? "text"}
        inputMode={extra.inputMode}
        key={fromPin ? `${pin.latitude}|${pin.longitude}` : undefined}
        defaultValue={((fromPin ? pin : o)?.[name as "latitude"] as string | number | null | undefined) ?? ""}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={[extra.hint && `org-${name}-hint`, errors[name] && `org-${name}-error`].filter(Boolean).join(" ") || undefined}
        className={inputClass}
      />
    </Field>
    );
  };

  const lastVerified = state.status === "saved" && state.lastVerified ? state.lastVerified : (o?.lastVerified ?? "");
  const verifiedBy = state.status === "saved" && state.lastVerifiedBy !== undefined ? state.lastVerifiedBy : o?.lastVerifiedBy;

  const saveLabel = id === undefined ? "Create Organization" : "Save Changes";
  /** The save result. `live` gives the boxes their roles; the copy by the bottom Save has none, so a screen reader reads it once. */
  const notices = (live: boolean) => (
    <>
      {state.status === "saved" && <Notice tone="success" role={live ? "status" : undefined}>{state.message}</Notice>}
      {notice && <Notice tone="warning" role={live ? "status" : undefined}>{notice}</Notice>}
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
              <label htmlFor="org-statusId" className="sr-only">
                Status
              </label>
              <select
                id="org-statusId"
                name="statusId"
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                aria-describedby={errors.statusId ? "org-statusId-error" : undefined}
                className={statusPillClass}
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.showOnSite ? "" : " (hidden from families)"}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={pending} className={buttonClass("primary")}>
                {saveLabel}
              </button>
            </div>
          }
        />
        {errors.statusId && (
          <p id="org-statusId-error" role="alert" className="mb-4 text-sm font-semibold text-red-700">
            {errors.statusId}
          </p>
        )}
        <div className="flex flex-col gap-3">{notices(true)}</div>
      </div>

      <Card title={sectionTitle("Title")}>
        <div className="flex flex-col gap-5">{text("name", "Name")}</div>
      </Card>

      <Card title={sectionTitle("Location")}>
        <div className="flex flex-col gap-5">
          {text("streetAddress", "Street address")}
          {text("suite", "Suite")}
          <div className="grid gap-4 sm:grid-cols-3">
            {text("city", "City")}
            {text("state", "State")}
            {text("zip", "ZIP")}
          </div>
          {text("county", "County")}
          <div className="grid gap-4 sm:grid-cols-2">
            {text("latitude", "Latitude", { inputMode: "decimal", hint: "For the map. Example: 42.9634" })}
            {text("longitude", "Longitude", { inputMode: "decimal", hint: "Example: -85.6681" })}
          </div>
        </div>
      </Card>

      <Card title={sectionTitle("Phone, Email & Website")}>
        <div className="flex flex-col gap-5">
          {text("phone", "Phone", { type: "tel" })}
          {text("email", "Email", { type: "email" })}
          {text("website", "Website", { hint: "Starts with https://", type: "url" })}
        </div>
      </Card>

      <Card title={sectionTitle("About")}>
        <div className="flex flex-col gap-5">
          <Field id="org-about" label="About" error={errors.about}>
            <textarea id="org-about" name="about" rows={6} defaultValue={o?.about ?? ""} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title={sectionTitle("Admin")}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-3">
            <Field id="org-lastVerified" label="Last verified" hint={verifiedBy ? `Verified by ${verifiedBy}` : undefined} error={errors.lastVerified}>
              {/* key: a new value from "Mark verified" replaces what the input shows. */}
              <input
                key={lastVerified}
                id="org-lastVerified"
                name="lastVerified"
                aria-describedby={verifiedBy ? "org-lastVerified-hint" : undefined}
                type="date"
                defaultValue={lastVerified}
                className={inputClass}
              />
            </Field>
            {id !== undefined && (
              <button type="submit" name="intent" value="verify" disabled={pending} className={buttonClass("secondary")}>
                Mark verified
              </button>
            )}
          </div>
          <Field id="org-internalNotes" label="Internal notes" hint="Not shown on the website." error={errors.internalNotes}>
            <textarea
              id="org-internalNotes"
              name="internalNotes"
              rows={3}
              defaultValue={o?.internalNotes ?? ""}
              aria-describedby="org-internalNotes-hint"
              className={inputClass}
            />
          </Field>
          <CustomFieldInputs idPrefix="org" fields={customFields} values={o?.custom ?? {}} errors={errors} manageLink={id !== undefined} />
          {children}
        </div>
      </Card>

      <div aria-hidden="true" className="flex flex-col gap-3">
        {notices(false)}
      </div>
      <button type="submit" disabled={pending} className={`${buttonClass("primary")} w-full max-w-sm self-center`}>
        {saveLabel}
      </button>
    </form>
  );
}
