"use client";

import { useActionState } from "react";
import type { DirectoryHeadingContent, DirectoryHeadingField } from "@/admin/directory-heading";
import { Field, Notice, buttonClass, inputClass } from "../_components/ui";
import { saveDirectoryHeadingAction, type DirectoryHeadingFormState } from "./actions";

const idle: DirectoryHeadingFormState = { result: "idle" };

/** `saved` has "" for a field that uses its default; the default shows as the placeholder. */
export function DirectoryHeadingForm({ saved, defaults }: { saved: Record<DirectoryHeadingField, string>; defaults: DirectoryHeadingContent }) {
  const [state, action, pending] = useActionState(saveDirectoryHeadingAction, idle);
  // After a save, the fields show what was sent (React resets the form, even on an error).
  const shown = state.result === "idle" ? saved : state.values;
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <Field id="dh-heading" label="Heading">
        <input id="dh-heading" name="heading" type="text" defaultValue={shown.heading} placeholder={defaults.heading} className={inputClass} />
      </Field>
      <Field id="dh-subheading" label="Subheading" hint="The 'Need more assistance?' link always follows it.">
        <textarea
          id="dh-subheading"
          name="subheading"
          rows={3}
          defaultValue={shown.subheading}
          placeholder={defaults.subheading}
          aria-describedby="dh-subheading-hint"
          className={inputClass}
        />
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
