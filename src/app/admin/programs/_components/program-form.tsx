"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { Option, OrganizationOption, ProgramFormOptions, ProgramInput } from "@/admin/programs";
import { Field, Notice, buttonClass, hintClass, inputClass, labelClass } from "../../_components/ui";
import { saveProgramAction, type ProgramFormState } from "../actions";

const IDLE: ProgramFormState = { status: "idle" };
const errorClass = "text-sm font-semibold text-red-700";
const checkRowClass = "flex min-h-9 items-center gap-2";

/** A group of checkboxes that sends one `name` value per checked box. */
function Checks({
  name,
  legend,
  hint,
  options,
  checked,
  error,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: Option[];
  checked: number[];
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className={labelClass}>{legend}</legend>
      {hint && <p className={hintClass}>{hint}</p>}
      <div className="grid gap-x-4 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.id} className={checkRowClass}>
            <input type="checkbox" name={name} value={o.id} defaultChecked={checked.includes(o.id)} />
            {o.name}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} role="alert" className={errorClass}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * The Program form. `program` is empty on the "new" page. Submitted with `onSubmit`, not
 * `<form action>`: React 19 would reset the fields after the action, and a refused save would lose
 * the text. Blank address, phone, and website fields show the Organization's value as the
 * placeholder (Inheritance).
 */
export function ProgramForm({
  id,
  program,
  organizationId,
  options,
}: {
  id?: number;
  program?: ProgramInput;
  /** Preselected Organization on the "new" page (`?org=`). */
  organizationId?: number;
  options: ProgramFormOptions;
}) {
  const [state, dispatch, pending] = useActionState(saveProgramAction, IDLE);
  const [orgId, setOrgId] = useState(String(program?.organizationId ?? organizationId ?? ""));
  const [categoryIds, setCategoryIds] = useState<number[]>(program?.categoryIds ?? []);
  const [acceptanceId, setAcceptanceId] = useState(String(program?.insuranceAcceptanceId ?? ""));
  const errors = state.status === "invalid" ? state.errors : {};
  const p = program;
  const org: OrganizationOption | undefined = options.organizations.find((o) => String(o.id) === orgId);
  const acceptsYes = options.insuranceAcceptanceOptions.find((o) => String(o.id) === acceptanceId)?.name.trim().toLowerCase() === "yes";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The button that was clicked, so `intent=verify` reaches the action.
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(data));
  }

  const describedBy = (name: string, hint?: string) =>
    [hint && `program-${name}-hint`, errors[name] && `program-${name}-error`].filter(Boolean).join(" ") || undefined;

  /** A text input. `inherit` names the Organization field shown as the placeholder. */
  const text = (
    name: keyof ProgramInput,
    label: string,
    extra: { hint?: string; type?: string; inputMode?: "decimal"; inherit?: keyof OrganizationOption } = {},
  ) => {
    const inherited = extra.inherit && org?.[extra.inherit];
    return (
      <Field id={`program-${name}`} label={label} hint={extra.hint} error={errors[name]}>
        <input
          id={`program-${name}`}
          name={name}
          type={extra.type ?? "text"}
          inputMode={extra.inputMode}
          defaultValue={(p?.[name] as string | number | null | undefined) ?? ""}
          placeholder={inherited == null ? undefined : String(inherited)}
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={describedBy(name, extra.hint)}
          className={inputClass}
        />
      </Field>
    );
  };

  const select = (name: keyof ProgramInput, label: string, list: Option[], blank: string) => (
    <Field id={`program-${name}`} label={label} error={errors[name]}>
      <select
        id={`program-${name}`}
        name={name}
        defaultValue={String(p?.[name] ?? "")}
        aria-describedby={describedBy(name)}
        className={inputClass}
      >
        <option value="">{blank}</option>
        {list.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Field>
  );

  const lastVerified = state.status === "saved" && state.lastVerified ? state.lastVerified : (p?.lastVerified ?? "");

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id ?? ""} />
      <Field id="program-organizationId" label="Organization" error={errors.organizationId}>
        <select
          id="program-organizationId"
          name="organizationId"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          aria-describedby={describedBy("organizationId")}
          className={inputClass}
        >
          <option value="">Select an Organization</option>
          {options.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
      {text("name", "Program name")}
      <Field id="program-description" label="Description" error={errors.description}>
        <textarea
          id="program-description"
          name="description"
          rows={4}
          defaultValue={p?.description ?? ""}
          aria-describedby={describedBy("description")}
          className={inputClass}
        />
      </Field>
      {text("searchKeywords", "Search keywords", {
        hint: "Words a parent might type that are not in the name or description, for example PPD, baby blues, nursing.",
      })}

      <fieldset className="flex flex-col gap-1" aria-describedby={errors.categoryIds || errors.subcategoryIds ? "categories-error" : undefined}>
        <legend className={labelClass}>Categories</legend>
        <p className={hintClass}>Check at least one. Subcategories show under each checked Category.</p>
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
                      <input type="checkbox" name="subcategoryIds" value={s.id} defaultChecked={p?.subcategoryIds.includes(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {(errors.categoryIds || errors.subcategoryIds) && (
          <p id="categories-error" role="alert" className={errorClass}>
            {errors.categoryIds ?? errors.subcategoryIds}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={labelClass}>Address and contact</legend>
        <p className={hintClass}>Leave a field blank to use the Organization&apos;s value, shown in grey.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("streetAddress", "Street address", { inherit: "streetAddress" })}
          {text("suite", "Suite", { inherit: "suite" })}
          {text("city", "City", { inherit: "city" })}
          {text("state", "State", { inherit: "state" })}
          {text("zip", "ZIP", { inherit: "zip" })}
          {text("phone", "Phone", { type: "tel", inherit: "phone" })}
          {text("website", "Website", { type: "url", hint: "Starts with https://", inherit: "website" })}
          <span />
          {text("latitude", "Latitude", { inputMode: "decimal", hint: "For the map. Example: 42.9634", inherit: "latitude" })}
          {text("longitude", "Longitude", { inputMode: "decimal", hint: "Example: -85.6681", inherit: "longitude" })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {select("serviceFormatId", "Service format", options.serviceFormats, "Not set")}
        {text("hours", "Hours", { hint: "Example: Mon to Fri 9am to 5pm" })}
        {select("costOptionId", "Cost", options.costOptions, "Not set")}
        <Field id="program-insuranceAcceptanceId" label="Accepts insurance" error={errors.insuranceAcceptanceId}>
          <select
            id="program-insuranceAcceptanceId"
            name="insuranceAcceptanceId"
            value={acceptanceId}
            onChange={(e) => setAcceptanceId(e.target.value)}
            className={inputClass}
          >
            <option value="">Unknown</option>
            {options.insuranceAcceptanceOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {acceptsYes && (
        <Checks name="insurancePlanIds" legend="Insurance plans accepted" options={options.insurancePlans} checked={p?.insurancePlanIds ?? []} error={errors.insurancePlanIds} />
      )}
      <Checks name="languageIds" legend="Languages" options={options.languages} checked={p?.languageIds ?? []} error={errors.languageIds} />
      <Checks name="audienceIds" legend="Who it serves" options={options.audiences} checked={p?.audienceIds ?? []} error={errors.audienceIds} />
      <Field id="program-eligibilityNotes" label="Eligibility notes" error={errors.eligibilityNotes}>
        <textarea id="program-eligibilityNotes" name="eligibilityNotes" rows={3} defaultValue={p?.eligibilityNotes ?? ""} className={inputClass} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="program-statusId" label="Status" error={errors.statusId}>
          <select id="program-statusId" name="statusId" defaultValue={String(p?.statusId ?? options.statuses[0]?.id ?? "")} className={inputClass}>
            {options.statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.showOnSite ? "" : " (hidden from families)"}
              </option>
            ))}
          </select>
        </Field>
        <Field id="program-lastVerified" label="Last verified" error={errors.lastVerified}>
          {/* key: a new value from "Mark verified" replaces what the input shows. */}
          <input key={lastVerified} id="program-lastVerified" name="lastVerified" type="date" defaultValue={lastVerified} className={inputClass} />
        </Field>
      </div>
      <Field id="program-internalNotes" label="Internal notes" hint="Not shown on the website." error={errors.internalNotes}>
        <textarea
          id="program-internalNotes"
          name="internalNotes"
          rows={3}
          defaultValue={p?.internalNotes ?? ""}
          aria-describedby="program-internalNotes-hint"
          className={inputClass}
        />
      </Field>

      {state.status === "saved" && <Notice tone="success" role="status">{state.message}</Notice>}
      {state.status === "invalid" && <Notice tone="error" role="alert">{state.message}</Notice>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {id === undefined ? "Create Program" : "Save"}
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
