/**
 * The custom field inputs at the end of a record's Admin form (src/custom-fields/form.ts). Inputs are
 * named `custom.<field id>`; the hidden `customFieldIds` tells the server which fields this form showed.
 * Uncontrolled inputs, like the rest of the form: a refused save keeps what the staff member typed.
 */
import { CUSTOM_FIELD_IDS, customInputName } from "@/custom-fields/form";
import type { CustomFieldDefinition, CustomFieldType, CustomValue, CustomValues } from "@/custom-fields/types";
import { Field, hintClass, inputClass, labelClass, linkClass } from "./ui";

const errorClass = "text-sm font-semibold text-red-700";

/** Number and link are "text": the server's checks (and their messages) do the work, not the browser. */
const INPUT_TYPES: Partial<Record<CustomFieldType, string>> = { date: "date", phone: "tel", email: "email" };

export function CustomFieldInputs({
  idPrefix,
  fields,
  values,
  errors,
  manageHref,
}: {
  /** Makes input ids unique on the page, for example "program". */
  idPrefix: string;
  /** The active fields of this record type, in order (fieldsFor). */
  fields: readonly CustomFieldDefinition[];
  /** The record's `custom` column; {} for a new record. */
  values: CustomValues;
  /** Form errors, keyed by input name. */
  errors: Record<string, string>;
  /** Owners only: the link to the Custom fields page, at this record type's section. */
  manageHref?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
      <legend className={`${labelClass} text-lg`}>More details</legend>
      <p className={hintClass}>
        Custom fields. Leave a field blank if you don&apos;t know: blank is never shown as &ldquo;No&rdquo;.
        {manageHref && (
          <>
            {" "}
            <a href={manageHref} className={linkClass}>
              Add or change fields
            </a>
          </>
        )}
      </p>
      <input type="hidden" name={CUSTOM_FIELD_IDS} value={fields.map((f) => f.id).join(",")} />
      {fields.length === 0 && <p className={hintClass}>No custom fields yet.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <CustomFieldInput
            key={field.id}
            id={`${idPrefix}-custom-${field.id}`}
            field={field}
            value={values[field.id]}
            error={errors[customInputName(field.id)]}
          />
        ))}
      </div>
    </fieldset>
  );
}

function CustomFieldInput({ id, field, value, error }: { id: string; field: CustomFieldDefinition; value: CustomValue | undefined; error?: string }) {
  const name = customInputName(field.id);
  const hint = [field.helpText, field.showOnWebsite ? null : "Staff only: not shown on the website."].filter(Boolean).join(" ") || undefined;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const common = { id, name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, className: inputClass } as const;
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  // A hidden option is offered only to a record that already has it.
  const offered = field.options.filter((o) => !o.hidden || o.key === value || (Array.isArray(value) && value.includes(o.key)));
  const optionLabel = (o: { label: string; hidden: boolean }) => (o.hidden ? `${o.label} (hidden option)` : o.label);

  if (field.type === "multiChoice") {
    return (
      <fieldset className="flex flex-col gap-1 sm:col-span-2" aria-describedby={describedBy}>
        <legend className={labelClass}>{field.label}</legend>
        {hint && (
          <p id={`${id}-hint`} className={hintClass}>
            {hint}
          </p>
        )}
        <div className="grid gap-x-4 sm:grid-cols-2">
          {offered.map((o) => (
            <label key={o.key} className="flex min-h-9 items-center gap-2">
              <input type="checkbox" name={name} value={o.key} defaultChecked={Array.isArray(value) && value.includes(o.key)} />
              {optionLabel(o)}
            </label>
          ))}
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className={errorClass}>
            {error}
          </p>
        )}
      </fieldset>
    );
  }

  let input;
  switch (field.type) {
    case "longText":
      input = <textarea {...common} rows={3} defaultValue={text} />;
      break;
    case "yesNo":
      input = (
        <select {...common} defaultValue={value === true ? "yes" : value === false ? "no" : ""}>
          <option value="">Unknown</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      );
      break;
    case "choice":
      input = (
        <select {...common} defaultValue={text}>
          <option value="">Unknown</option>
          {offered.map((o) => (
            <option key={o.key} value={o.key}>
              {optionLabel(o)}
            </option>
          ))}
        </select>
      );
      break;
    default:
      input = (
        <input
          {...common}
          type={INPUT_TYPES[field.type] ?? "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          defaultValue={text}
          placeholder={field.type === "link" ? "https://" : undefined}
        />
      );
  }

  return (
    <div className={field.type === "longText" ? "sm:col-span-2" : undefined}>
      <Field id={id} label={field.label} hint={hint} error={error}>
        {input}
      </Field>
    </div>
  );
}
