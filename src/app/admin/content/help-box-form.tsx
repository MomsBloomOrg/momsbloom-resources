"use client";

import { useActionState } from "react";
import type { HelpBoxContent, HelpBoxField } from "@/admin/help-box";
import { Field, Notice, buttonClass, inputClass } from "../_components/ui";
import { saveHelpBoxAction, type HelpBoxFormState } from "./actions";

const idle: HelpBoxFormState = { result: "idle" };

/**
 * `saved` has "" for a field that uses its default; the default shows as the placeholder. A blank
 * field and Save bring the default back.
 */
export function HelpBoxForm({ saved, defaults }: { saved: Record<HelpBoxField, string>; defaults: HelpBoxContent }) {
  const [state, action, pending] = useActionState(saveHelpBoxAction, idle);
  // After a save, the fields show what was sent (React resets the form, even on an error).
  const shown = state.result === "idle" ? saved : state.values;
  const input = (name: HelpBoxField, id: string) => (
    <input id={id} name={name} type={name === "buttonUrl" ? "url" : "text"} defaultValue={shown[name]} placeholder={defaults[name]} className={inputClass} />
  );
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <Field id="hb-heading" label="Heading">
        {input("heading", "hb-heading")}
      </Field>
      <Field id="hb-body" label="Body" hint="Type {phone} where the phone link goes. Without it, the body shows no phone link.">
        <textarea
          id="hb-body"
          name="body"
          rows={4}
          defaultValue={shown.body}
          placeholder={defaults.body}
          aria-describedby="hb-body-hint"
          className={inputClass}
        />
      </Field>
      <Field id="hb-phone" label="Phone" hint="For example 211 or 616-555-0100. It shows as you type it.">
        {input("phone", "hb-phone")}
      </Field>
      <Field id="hb-label" label="Button label">
        {input("buttonLabel", "hb-label")}
      </Field>
      <Field id="hb-url" label="Button link" hint="A full address that starts with https://.">
        {input("buttonUrl", "hb-url")}
      </Field>
      <p className="text-sm text-muted">Leave a field blank to show the default text.</p>
      {state.result === "error" && <Notice tone="error" role="alert">{state.message}</Notice>}
      {state.result === "ok" && <Notice tone="success" role="status">{state.message}</Notice>}
      <div>
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
