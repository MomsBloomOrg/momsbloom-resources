"use client";

import { NOT_PLACED } from "@/admin/geocode";
import { ChevronDown, X } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { Option, OrganizationOption, ProgramFormOptions, ProgramInput } from "@/admin/programs";
import type { CustomFieldDefinition } from "@/custom-fields/types";
import { CustomFieldInputs } from "../../_components/custom-field-inputs";
import { Card, Field, Notice, PageHeader, buttonClass, hintClass, inputClass, labelClass } from "../../_components/ui";
import { lastGoodPin } from "../../_components/last-good-pin";
import { saveProgramAction, type ProgramFormState } from "../actions";

const IDLE: ProgramFormState = { status: "idle" };
const errorClass = "text-sm font-semibold text-red-700";
const checkRowClass = "flex min-h-9 items-center gap-2";
const CHIP_LISTS = ["categoryIds", "subcategoryIds", "insurancePlanIds", "languageIds", "audienceIds"] as const;
const chipOptions = (name: string, list: Option[]): ChipOption[] => list.map((o) => ({ name, id: o.id, label: o.name }));

/** A group of checkboxes that sends one `name` value per checked box. */
export function Checks({
  name,
  legend,
  hint,
  options,
  checked,
  error,
  hidden,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: Option[];
  checked: number[];
  error?: string;
  hidden?: boolean;
}) {
  return (
    <fieldset hidden={hidden} disabled={hidden} className="flex flex-col gap-1" aria-describedby={error ? `${name}-error` : undefined}>
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

/** The heading of a form card: smaller than the Card default, as in the Edit Resource design. */
export const sectionTitle = (title: string) => <span className="text-xl font-semibold text-muted">{title}</span>;

/** One checkbox of a ChipSelect. It sends `name=id` when checked. */
export interface ChipOption {
  name: string;
  id: number;
  label: string;
  /** A Subcategory under its Category. */
  indent?: boolean;
}

const chipKey = (o: ChipOption) => `${o.name}:${o.id}`;

/**
 * A multi-select: a removable chip for each checked option, above a native `<details>` list of real
 * checkboxes. The panel is inline (not a popup), so it needs no focus trap or combobox role. The
 * parent keeps `checked` (keys `name:id`), so a check survives while its option is not rendered, and
 * an option that is not rendered is not sent.
 */
export function ChipSelect({
  id,
  legend,
  hint,
  options,
  checked,
  onToggle,
  error,
}: {
  id: string;
  legend: string;
  hint?: string;
  options: ChipOption[];
  checked: ReadonlySet<string>;
  onToggle: (key: string, on: boolean) => void;
  error?: string;
}) {
  const summary = useRef<HTMLElement>(null);
  const chips = options.filter((o) => checked.has(chipKey(o)));
  const nested = options.some((o) => o.indent);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={describedBy}>
      <legend className={labelClass}>{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
      <div className="rounded-lg border border-muted/70 bg-surface">
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-2 px-4 pt-2.5" aria-label={`Selected ${legend.toLowerCase()}`}>
            {chips.map((o) => (
              <li key={chipKey(o)} className="inline-flex items-center gap-1 rounded-full bg-secondary-soft py-0.5 pl-3 pr-1 text-sm text-ink">
                {o.label}
                <button
                  type="button"
                  aria-label={`Remove ${o.label}`}
                  onClick={() => {
                    onToggle(chipKey(o), false);
                    summary.current?.focus();
                  }}
                  className="rounded-full p-1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text"
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <details className="group">
          <summary
            ref={summary}
            className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text [&::-webkit-details-marker]:hidden"
          >
            Choose…
            <ChevronDown size={18} aria-hidden className="transition-transform group-open:rotate-180" />
          </summary>
          <div className={`grid gap-x-4 border-t border-line px-4 py-2 ${nested ? "" : "sm:grid-cols-2"}`}>
            {options.map((o) => (
              <label key={chipKey(o)} className={`${checkRowClass} ${o.indent ? "ml-7" : nested ? "font-semibold" : ""}`}>
                <input type="checkbox" name={o.name} value={o.id} checked={checked.has(chipKey(o))} onChange={(e) => onToggle(chipKey(o), e.target.checked)} />
                {o.label}
              </label>
            ))}
          </div>
        </details>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className={errorClass}>
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
 * placeholder (Inheritance). The form holds the page header, so the top and bottom Save send the
 * same data.
 */
export function ProgramForm({
  id,
  program,
  organizationId,
  options,
  customFields,
  title,
  back,
  actions,
  children,
}: {
  id?: number;
  program?: ProgramInput;
  /** Preselected Organization on the "new" page (`?org=`). */
  organizationId?: number;
  options: ProgramFormOptions;
  /** The active Program custom fields, in order. */
  customFields: readonly CustomFieldDefinition[];
  title: string;
  back?: ReactNode;
  /** Header actions before the Status select, for example "View on site". */
  actions?: ReactNode;
  /** The end of the Admin card, for example "Last changed". */
  children?: ReactNode;
}) {
  const [state, dispatch, pending] = useActionState(saveProgramAction, IDLE);
  const [orgId, setOrgId] = useState(String(program?.organizationId ?? organizationId ?? ""));
  // Every chip checkbox, as `name:id`. Kept while a group is not rendered, so a Category off/on or Accepts insurance No/Yes brings the checks back.
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(CHIP_LISTS.flatMap((name) => (program?.[name] ?? []).map((v) => `${name}:${v}`))),
  );
  const onToggle = (key: string, on: boolean) =>
    setChecked((old) => {
      const next = new Set(old);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const [acceptanceId, setAcceptanceId] = useState(String(program?.insuranceAcceptanceId ?? ""));
  const errors = state.status === "invalid" ? state.errors : {};
  // After a save: the save's notice. Before: an address with no pin (a create redirects, so it lands here).
  const notice = state.status === "saved" ? state.notice : program?.streetAddress && program.latitude == null && program.longitude == null ? NOT_PLACED : undefined;
  const p = program;
  // The pin of the last good save, kept across a refused save. The inputs are keyed on it, so a later Save does not send the old pin.
  const [pin, setPin] = useState({ latitude: p?.latitude, longitude: p?.longitude });
  const next = lastGoodPin(pin, state);
  if (next !== pin) setPin(next);
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
    const fromPin = name === "latitude" || name === "longitude";
    return (
      <Field id={`program-${name}`} label={label} hint={extra.hint} error={errors[name]}>
        <input
          id={`program-${name}`}
          name={name}
          type={extra.type ?? "text"}
          inputMode={extra.inputMode}
          key={fromPin ? `${pin.latitude}|${pin.longitude}` : undefined}
          defaultValue={((fromPin ? pin : p)?.[name as "latitude"] as string | number | null | undefined) ?? ""}
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
  // A Subcategory is listed (and sent) only while its Category is checked.
  const categoryOptions = options.categories.flatMap((c): ChipOption[] => [
    { name: "categoryIds", id: c.id, label: c.name },
    ...(checked.has(`categoryIds:${c.id}`)
      ? options.subcategories.filter((s) => s.categoryId === c.id).map((s) => ({ name: "subcategoryIds", id: s.id, label: s.name, indent: true }))
      : []),
  ]);
  const saveLabel = id === undefined ? "Create Program" : "Save Changes";
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
              <label htmlFor="program-statusId" className="sr-only">
                Status
              </label>
              <select
                id="program-statusId"
                name="statusId"
                defaultValue={String(p?.statusId ?? options.statuses[0]?.id ?? "")}
                aria-describedby={describedBy("statusId")}
                className="min-h-9 rounded-full border border-muted/70 bg-secondary-soft px-4 py-1.5 text-sm font-semibold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-text focus-visible:ring-offset-1"
              >
                {options.statuses.map((s) => (
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
          <p id="program-statusId-error" role="alert" className={`${errorClass} mb-4`}>
            {errors.statusId}
          </p>
        )}
        <div className="flex flex-col gap-3">{notices(true)}</div>
      </div>

      <Card title={sectionTitle("Title")}>
        <div className="flex flex-col gap-5">
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
        </div>
      </Card>

      <Card title={sectionTitle("Location & Hours")}>
        <div className="flex flex-col gap-5">
          <p className={hintClass}>Leave an address, phone, or website field blank to use the Organization&apos;s value, shown in grey.</p>
          {text("streetAddress", "Street address", { inherit: "streetAddress" })}
          <div className="grid gap-4 sm:grid-cols-4">
            {text("suite", "Suite", { inherit: "suite" })}
            {text("city", "City", { inherit: "city" })}
            {text("state", "State", { inherit: "state" })}
            {text("zip", "ZIP", { inherit: "zip" })}
          </div>
          {text("website", "Website", { type: "url", hint: "Starts with https://", inherit: "website" })}
          {text("phone", "Phone", { type: "tel", inherit: "phone" })}
          {text("hours", "Hours", { hint: "Example: Mon to Fri 9am to 5pm" })}
          {select("serviceFormatId", "How you'll connect", options.serviceFormats, "Not set")}
          <ChipSelect
            id="program-categories"
            legend="Categories"
            hint="Choose at least one. Subcategories show under each checked Category."
            options={categoryOptions}
            checked={checked}
            onToggle={onToggle}
            error={errors.categoryIds ?? errors.subcategoryIds}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {text("latitude", "Latitude", { inputMode: "decimal", hint: "For the map. Example: 42.9634", inherit: "latitude" })}
            {text("longitude", "Longitude", { inputMode: "decimal", hint: "Example: -85.6681", inherit: "longitude" })}
          </div>
        </div>
      </Card>

      <Card title={sectionTitle("About")}>
        <div className="flex flex-col gap-5">
          <Field id="program-description" label="About" error={errors.description}>
            <textarea
              id="program-description"
              name="description"
              rows={6}
              defaultValue={p?.description ?? ""}
              aria-describedby={describedBy("description")}
              className={inputClass}
            />
          </Field>
          {text("searchKeywords", "Search keywords", {
            hint: "Words a parent might type that are not in the name or description, for example PPD, baby blues, nursing.",
          })}
        </div>
      </Card>

      <Card title={sectionTitle("Insurance & Cost")}>
        <div className="flex flex-col gap-5">
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
          {acceptsYes && (
            <ChipSelect
              id="program-insurancePlanIds"
              legend="Insurance plans accepted"
              options={chipOptions("insurancePlanIds", options.insurancePlans)}
              checked={checked}
              onToggle={onToggle}
              error={errors.insurancePlanIds}
            />
          )}
          {select("costOptionId", "Cost", options.costOptions, "Not set")}
          <Field id="program-eligibilityNotes" label="Eligibility notes" error={errors.eligibilityNotes}>
            <textarea id="program-eligibilityNotes" name="eligibilityNotes" rows={3} defaultValue={p?.eligibilityNotes ?? ""} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title={sectionTitle("Who it serves")}>
        <div className="flex flex-col gap-5">
          <ChipSelect id="program-languageIds" legend="Languages" options={chipOptions("languageIds", options.languages)} checked={checked} onToggle={onToggle} error={errors.languageIds} />
          <ChipSelect id="program-audienceIds" legend="Who it serves" options={chipOptions("audienceIds", options.audiences)} checked={checked} onToggle={onToggle} error={errors.audienceIds} />
        </div>
      </Card>

      <Card title={sectionTitle("Admin")}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-3">
            <Field id="program-lastVerified" label="Last verified" error={errors.lastVerified}>
              {/* key: a new value from "Mark verified" replaces what the input shows. */}
              <input key={lastVerified} id="program-lastVerified" name="lastVerified" type="date" defaultValue={lastVerified} className={inputClass} />
            </Field>
            {id !== undefined && (
              <button type="submit" name="intent" value="verify" disabled={pending} className={buttonClass("secondary")}>
                Mark verified
              </button>
            )}
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
          <CustomFieldInputs idPrefix="program" fields={customFields} values={p?.custom ?? {}} errors={errors} manageLink={id !== undefined} />
          {children}
        </div>
      </Card>

      {notices(false)}
      <button type="submit" disabled={pending} className={`${buttonClass("primary")} w-full max-w-sm self-center`}>
        {saveLabel}
      </button>
    </form>
  );
}
