import type { ShownCustomValue } from "@/custom-fields/values";
import { telHref, webUrl } from "./program-card";

/** A label and its value. Hidden when there is no value: never show a missing value as "No". */
export function Field({ name, children }: { name: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-sm text-muted">{name}</p>
      <div>{children}</div>
    </div>
  );
}

/** One custom field answer. Links, phone numbers, and emails are links. */
export function CustomField({ field }: { field: ShownCustomValue }) {
  const href =
    field.type === "link" ? webUrl(field.text) : field.type === "phone" ? telHref(field.text) : field.type === "email" ? `mailto:${field.text}` : null;
  return (
    <Field name={field.label}>
      {href ? (
        <a href={href} {...(field.type === "link" ? { target: "_blank", rel: "noopener" } : {})} className="underline">
          {field.text}
        </a>
      ) : (
        <span className="whitespace-pre-line">{field.text}</span>
      )}
    </Field>
  );
}

const REQUEST_UPDATE_URL = "https://forms.cloud.microsoft/r/0DgyX0L0JS";

/** "Request an update" opens the MomsBloom form. The `r14e…` parameter is the ID of the form question "Which program or services does this apply to?". */
export function RequestUpdate({ record }: { record: string }) {
  return (
    <a
      href={`${REQUEST_UPDATE_URL}?r14e623fa7c204883bc6d93bbf151541d=${encodeURIComponent(record)}`}
      target="_blank"
      rel="noopener"
      className="underline"
    >
      Request an update<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
