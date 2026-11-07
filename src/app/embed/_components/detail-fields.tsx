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
