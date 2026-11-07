"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import type { ContactRow } from "@/admin/contacts";
import { Badge, Card, EmptyState, Field, Notice, buttonClass, inputClass } from "../../../_components/ui";
import { saveContactAction, type ContactFormState } from "./contact-actions";

const IDLE: ContactFormState = { status: "idle" };

/** One Contact form: edit (with Remove) when `contact` is set, "Add contact" when it is not. */
function ContactForm({ programId, contact, onAdded }: { programId: number; contact?: ContactRow; onAdded?: () => void }) {
  const [state, dispatch, pending] = useActionState(saveContactAction, IDLE);
  const errors = state.status === "invalid" ? state.errors : {};
  const key = contact ? `contact-${contact.id}` : "contact-new";

  // A good add empties the form: the parent gives it a new key.
  useEffect(() => {
    if (!contact && state.status === "saved") onAdded?.();
  }, [contact, state, onAdded]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The button that was clicked, so `intent=remove` reaches the action.
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    if (data.get("intent") === "remove" && !window.confirm(`Remove ${contact?.name}? This cannot be undone.`)) return;
    startTransition(() => dispatch(data));
  }

  const text = (name: keyof ContactRow, label: string, type = "text") => (
    <Field id={`${key}-${name}`} label={label} error={errors[name]}>
      <input
        id={`${key}-${name}`}
        name={name}
        type={type}
        defaultValue={(contact?.[name] as string | null | undefined) ?? ""}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${key}-${name}-error` : undefined}
        className={inputClass}
      />
    </Field>
  );

  return (
    <form method="post" onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="programId" value={programId} />
      <input type="hidden" name="contactId" value={contact?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        {text("name", "Name")}
        {text("title", "Title")}
        {text("specialty", "Specialty")}
        {text("phone", "Phone", "tel")}
        {text("email", "Email", "email")}
        <label className="flex min-h-11 items-center gap-2 self-end font-semibold">
          <input type="checkbox" name="showOnWebsite" defaultChecked={contact?.showOnWebsite ?? false} />
          Show on website
        </label>
      </div>
      <Field id={`${key}-internalNotes`} label="Internal notes" hint="Not shown on the website." error={errors.internalNotes}>
        <textarea id={`${key}-internalNotes`} name="internalNotes" rows={2} defaultValue={contact?.internalNotes ?? ""} className={inputClass} />
      </Field>
      {state.status === "saved" && <Notice tone="success" role="status">{state.message}</Notice>}
      {state.status === "invalid" && <Notice tone="error" role="alert">{state.message}</Notice>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
          {contact ? "Save contact" : "Add contact"}
        </button>
        {contact && (
          <button type="submit" name="intent" value="remove" disabled={pending} className={buttonClass("danger", "sm")}>
            Remove
          </button>
        )}
      </div>
    </form>
  );
}

/** The Contacts of a Program: one small form each, plus "Add contact". Each form has its own action state. */
export function ContactsSection({ programId, contacts }: { programId: number; contacts: ContactRow[] }) {
  const [addKey, setAddKey] = useState(0);
  return (
    <Card title="Contacts" className="mt-6">
      <p className="mb-4 text-sm text-muted">Only Contacts marked &quot;Show on website&quot; are shown to families.</p>
      {contacts.length === 0 && <EmptyState>No Contacts yet.</EmptyState>}
      <ul className="flex flex-col gap-4">
        {contacts.map((c) => (
          <li key={c.id} className="rounded-md border border-line p-4">
            <p className="mb-3">
              <Badge tone={c.showOnWebsite ? "good" : "neutral"}>{c.showOnWebsite ? "Public" : "Private"}</Badge>
            </p>
            <ContactForm programId={programId} contact={c} />
          </li>
        ))}
      </ul>
      <details className="mt-4 rounded-md border border-line p-4">
        <summary className="cursor-pointer font-semibold">Add contact</summary>
        <div className="mt-3">
          <ContactForm key={addKey} programId={programId} onAdded={() => setAddKey((k) => k + 1)} />
        </div>
      </details>
    </Card>
  );
}
