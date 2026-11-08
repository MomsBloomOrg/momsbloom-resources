"use client";

import { NOT_PLACED } from "@/admin/geocode";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import type { OrganizationInput, StatusOption } from "@/admin/organizations";
import type { CustomFieldDefinition } from "@/custom-fields/types";
import { CustomFieldInputs } from "../../_components/custom-field-inputs";
import { Field, Notice, buttonClass, inputClass } from "../../_components/ui";
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
}: {
  id?: number;
  organization?: OrganizationInput;
  statuses: StatusOption[];
  /** Programs that families see now: the ones a hiding Status would remove. */
  hiddenProgramCount: number;
  /** The active Organization custom fields, in order. */
  customFields: readonly CustomFieldDefinition[];
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

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id ?? ""} />
      {text("name", "Name")}
      <Field id="org-about" label="About" error={errors.about}>
        <textarea id="org-about" name="about" rows={4} defaultValue={o?.about ?? ""} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("website", "Website", { hint: "Starts with https://", type: "url" })}
        {text("email", "Email", { type: "email" })}
        {text("phone", "Phone", { type: "tel" })}
        {text("county", "County")}
        {text("streetAddress", "Street address")}
        {text("suite", "Suite")}
        {text("city", "City")}
        {text("state", "State")}
        {text("zip", "ZIP")}
        <span />
        {text("latitude", "Latitude", { inputMode: "decimal", hint: "For the map. Example: 42.9634" })}
        {text("longitude", "Longitude", { inputMode: "decimal", hint: "Example: -85.6681" })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="org-statusId" label="Status" error={errors.statusId}>
          <select
            id="org-statusId"
            name="statusId"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className={inputClass}
          >
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.showOnSite ? "" : " (hidden from families)"}
              </option>
            ))}
          </select>
        </Field>
        <Field id="org-lastVerified" label="Last verified" hint={verifiedBy ? `Verified by ${verifiedBy}` : undefined} error={errors.lastVerified}>
          {/* key: a new value from "Mark verified" replaces what the input shows. */}
          <input
            key={lastVerified}
            id="org-lastVerified"
            name="lastVerified" aria-describedby={verifiedBy ? "org-lastVerified-hint" : undefined}
            type="date"
            defaultValue={lastVerified}
            className={inputClass}
          />
        </Field>
      </div>
      <CustomFieldInputs idPrefix="org" fields={customFields} values={o?.custom ?? {}} errors={errors} manageLink={id !== undefined} />
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

      {state.status === "saved" && <Notice tone="success" role="status">{state.message}</Notice>}
      {notice && <Notice tone="warning" role="status">{notice}</Notice>}
      {state.status === "invalid" && <Notice tone="error" role="alert">{state.message}</Notice>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {id === undefined ? "Create Organization" : "Save"}
        </button>
        {id !== undefined && (
          <button type="submit" name="intent" value="verify" disabled={pending} className={buttonClass("secondary")}>
            Mark verified
          </button>
        )}
      </div>
    </form>
  );
}
