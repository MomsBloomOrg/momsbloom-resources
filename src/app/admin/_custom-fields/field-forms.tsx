"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { FILTERABLE_TYPES, CHOICE_TYPES, CUSTOM_FIELD_TYPES, CUSTOM_FIELD_TYPE_LABELS, type CustomFieldDefinition, type CustomFieldType } from "@/custom-fields/types";
import type { AdminEntity } from "@/custom-fields/form";
import { previewFromForm, type FieldPreview } from "@/custom-fields/preview";
import { Badge, Field, buttonClass, hintClass, inputClass, labelClass } from "../_components/ui";
import { FieldPreviewPanel } from "./field-preview";
import { addFieldAction, fieldRowAction, type FieldFormState } from "./actions";

const idle: FieldFormState = { result: "idle" };
const button = buttonClass("secondary", "sm");
const summary = `cursor-pointer list-none ${button} [&::-webkit-details-marker]:hidden`;
const errorClass = "text-sm font-semibold text-red-700";
const checkRowClass = "flex min-h-9 items-center gap-2";

function Message({ state }: { state: FieldFormState }) {
  if (state.result === "idle") return null;
  return (
    <p role={state.result === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.result === "error" ? "text-red-700" : "text-ink"}`}>
      {state.message}
    </p>
  );
}

/**
 * Submits with `onSubmit`, not `<form action>`: React 19 would reset the fields after the action, and
 * a refused save would lose what was typed.
 */
function submitWith(dispatch: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(data));
  };
}

/**
 * "Who sees it" is a required choice with no default (Add), so staff never publish a field by
 * accident. "Use as a filter" shows only where the rules allow it.
 */
function Visibility({ idPrefix, entity, type, field, errors }: {
  idPrefix: string;
  entity: AdminEntity;
  type: CustomFieldType;
  field?: CustomFieldDefinition;
  errors: Record<string, string>;
}) {
  const canFilter = entity === "program" && FILTERABLE_TYPES.includes(type);
  const errorId = `${idPrefix}-visibility-error`;
  const choices = [
    { value: "public", label: "Families see it", checked: field?.showOnWebsite === true },
    { value: "staff", label: "Staff only", checked: field?.showOnWebsite === false },
  ];
  return (
    <div className="flex flex-col gap-1">
      <fieldset role="radiogroup" className="flex flex-col gap-1" aria-invalid={errors.showOnWebsite ? true : undefined} aria-describedby={errors.showOnWebsite ? errorId : undefined}>
        <legend className={labelClass}>Who sees it</legend>
        {choices.map((c) => (
          <label key={c.value} className={checkRowClass}>
            <input type="radio" name="visibility" value={c.value} required defaultChecked={c.checked} />
            {c.label}
          </label>
        ))}
        {errors.showOnWebsite && <p id={errorId} role="alert" className={errorClass}>{errors.showOnWebsite}</p>}
      </fieldset>
      {canFilter && (
        <label className={checkRowClass}>
          <input id={`${idPrefix}-filterable`} type="checkbox" name="filterable" defaultChecked={field?.filterable ?? false} />
          Use as a filter
        </label>
      )}
      {errors.filterable && <p role="alert" className={errorClass}>{errors.filterable}</p>}
    </div>
  );
}

const withPreview = "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]";

/** The Edit form's starting data, so the preview shows the saved field before anything changes. */
function savedFieldData(field: CustomFieldDefinition): FormData {
  const data = new FormData();
  data.set("label", field.label);
  data.set("visibility", field.showOnWebsite ? "public" : "staff");
  if (field.filterable) data.set("filterable", "on");
  for (const o of field.options) {
    data.append("optionKey", o.key);
    data.append("optionLabel", o.label);
    if (o.hidden) data.append("optionHidden", o.key);
  }
  return data;
}

/** "Add a field" for one record type. */
export function AddFieldForm({ entity, entityLabel }: { entity: AdminEntity; entityLabel: string }) {
  const [state, dispatch, pending] = useActionState(addFieldAction, idle);
  const [type, setType] = useState<CustomFieldType>("text");
  // A new key after each good add empties the form for the next field.
  const [formKey, setFormKey] = useState(0);
  const [seen, setSeen] = useState(state);
  const [preview, setPreview] = useState<FieldPreview>(() => previewFromForm(entity, "text", new FormData()));
  if (state !== seen) {
    setSeen(state);
    if (state.result === "ok") {
      setFormKey((k) => k + 1);
      setPreview(previewFromForm(entity, type, new FormData()));
    }
  }
  const errors = state.result === "error" ? state.errors : {};
  const id = `add-${entity}`;

  return (
    <div className={withPreview}>
    <form
      key={formKey}
      method="post"
      onSubmit={submitWith(dispatch)}
      onChange={(e) => {
        const data = new FormData(e.currentTarget);
        setPreview(previewFromForm(entity, data.get("type") as CustomFieldType, data));
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="entity" value={entity} />
      <h3 className="text-xl font-normal">Add {/^[AEIOU]/.test(entityLabel) ? "an" : "a"} {entityLabel} field</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-type`} label="Field type" hint="It can't be changed later." error={errors.type}>
          <select id={`${id}-type`} name="type" value={type} onChange={(e) => setType(e.target.value as CustomFieldType)} className={inputClass}>
            {CUSTOM_FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {CUSTOM_FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-label`} label="Name" hint="For example: Parking" error={errors.label}>
          <input id={`${id}-label`} name="label" maxLength={80} className={inputClass} />
        </Field>
      </div>
      <Field id={`${id}-helpText`} label="Hint (optional)" hint="Shown under the input on the form." error={errors.helpText}>
        <input id={`${id}-helpText`} name="helpText" maxLength={300} className={inputClass} />
      </Field>
      {CHOICE_TYPES.includes(type) && (
        <Field id={`${id}-options`} label="Options" hint="One per line." error={errors.options}>
          <textarea id={`${id}-options`} name="options" rows={4} className={inputClass} />
        </Field>
      )}
      <Visibility idPrefix={id} entity={entity} type={type} errors={errors} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Adding…" : "Add field"}
        </button>
        <Message state={state} />
      </div>
    </form>
    <FieldPreviewPanel preview={preview} />
    </div>
  );
}

/** One active field: its name, type, and badges, and the edit, move, and archive controls. */
export function FieldRow({ field, first, last }: { field: CustomFieldDefinition; first: boolean; last: boolean }) {
  const [state, dispatch, pending] = useActionState(fieldRowAction, idle);
  const submit = submitWith(dispatch);
  const [preview, setPreview] = useState<FieldPreview>(() => previewFromForm(field.entity as AdminEntity, field.type, savedFieldData(field)));
  const errors = state.result === "error" ? state.errors : {};
  const isList = CHOICE_TYPES.includes(field.type);
  const id = `field-${field.id}`;
  const intent = (value: string) => (
    <>
      <input type="hidden" name="id" value={field.id} />
      <input type="hidden" name="intent" value={value} />
    </>
  );

  return (
    <li className="flex flex-col gap-2 border-b border-line py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-48 flex-1">
          <p className="font-semibold">{field.label}</p>
          <p className={hintClass}>
            {CUSTOM_FIELD_TYPE_LABELS[field.type]}
            {isList && `: ${field.options.filter((o) => !o.hidden).map((o) => o.label).join(", ")}`}
          </p>
        </div>
        <Badge tone={field.showOnWebsite ? "good" : "neutral"}>{field.showOnWebsite ? "Families see it" : "Staff only"}</Badge>
        {field.filterable && <Badge tone="good">Filter</Badge>}
        <form onSubmit={submit}>
          {intent("up")}
          <button type="submit" disabled={first || pending} className={button} aria-label={`Move ${field.label} up`}>
            Up
          </button>
        </form>
        <form onSubmit={submit}>
          {intent("down")}
          <button type="submit" disabled={last || pending} className={button} aria-label={`Move ${field.label} down`}>
            Down
          </button>
        </form>
        <form onSubmit={submit}>
          {intent("archive")}
          <button type="submit" disabled={pending} className={button}>
            Archive
          </button>
        </form>
      </div>

      <details open={state.result === "error" && Object.keys(errors).length > 0 ? true : undefined}>
        <summary className={summary}>Edit</summary>
        <div className={`mt-3 ${withPreview}`}>
        <form
          method="post"
          onSubmit={submit}
          onChange={(e) => setPreview(previewFromForm(field.entity as AdminEntity, field.type, new FormData(e.currentTarget)))}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-background p-4 sm:p-5"
        >
          {intent("edit")}
          <p className={hintClass}>
            Type: {CUSTOM_FIELD_TYPE_LABELS[field.type]}. It can&apos;t change: to change it, archive this field and add a new one.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-label`} label="Name" error={errors.label}>
              <input id={`${id}-label`} name="label" defaultValue={field.label} maxLength={80} className={inputClass} />
            </Field>
            <Field id={`${id}-helpText`} label="Hint (optional)" error={errors.helpText}>
              <input id={`${id}-helpText`} name="helpText" defaultValue={field.helpText ?? ""} maxLength={300} className={inputClass} />
            </Field>
          </div>
          {isList && (
            <fieldset className="flex flex-col gap-2">
              <legend className={labelClass}>Options</legend>
              <p className={hintClass}>
                Rename an option and every record that has it shows the new name. Options can&apos;t be deleted, only
                hidden: records that have a hidden option keep it.
              </p>
              {field.options.map((option, i) => (
                <div key={option.key} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="optionKey" value={option.key} />
                  <input
                    name="optionLabel"
                    defaultValue={option.label}
                    aria-label={`Option ${i + 1}`}
                    className={`${inputClass} max-w-xs`}
                  />
                  <label className={checkRowClass}>
                    <input type="checkbox" name="optionHidden" value={option.key} defaultChecked={option.hidden} />
                    Hidden
                  </label>
                </div>
              ))}
              <Field id={`${id}-newOptions`} label="Add options" hint="One per line." error={errors.options}>
                <textarea id={`${id}-newOptions`} name="newOptions" rows={2} className={inputClass} />
              </Field>
            </fieldset>
          )}
          <Visibility idPrefix={id} entity={field.entity as AdminEntity} type={field.type} field={field} errors={errors} />
          <div>
            <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
              {pending ? "Saving…" : "Save field"}
            </button>
          </div>
        </form>
        <FieldPreviewPanel preview={preview} />
        </div>
      </details>
      <Message state={state} />
    </li>
  );
}

/** An archived field, with Restore. */
export function ArchivedFieldRow({ field }: { field: CustomFieldDefinition }) {
  const [state, dispatch, pending] = useActionState(fieldRowAction, idle);
  return (
    <li className="flex flex-col gap-1 border-b border-line py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{field.label}</p>
          <p className={hintClass}>{CUSTOM_FIELD_TYPE_LABELS[field.type]}</p>
        </div>
        <form onSubmit={submitWith(dispatch)}>
          <input type="hidden" name="id" value={field.id} />
          <input type="hidden" name="intent" value="restore" />
          <button type="submit" disabled={pending} className={button}>
            Restore
          </button>
        </form>
      </div>
      <Message state={state} />
    </li>
  );
}
