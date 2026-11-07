"use client";

import { useActionState } from "react";
import type { AdminFacetValue, FacetKey } from "@/admin/facets";
import { Badge, buttonClass, inputClass, labelClass } from "../_components/ui";
import { addFacetValueAction, facetValueRowAction, type FacetFormState } from "./actions";

const idle: FacetFormState = { result: "idle" };
const button = buttonClass("secondary", "sm");
const summary = `cursor-pointer list-none ${button} [&::-webkit-details-marker]:hidden`;
const MAX_NAME_LENGTH = 100;

function Message({ state }: { state: FacetFormState }) {
  if (state.result === "idle") return null;
  return (
    <p role={state.result === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.result === "error" ? "text-red-700" : "text-ink"}`}>
      {state.message}
    </p>
  );
}

/** "New <label>" field and button. For a Subcategory, `categoryId` is its Category. */
export function AddValueForm({ facet, label, categoryId }: { facet: FacetKey; label: string; categoryId?: number }) {
  const [state, action, pending] = useActionState(addFacetValueAction, idle);
  const id = `add-${facet}-${categoryId ?? "all"}`;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="facet" value={facet} />
      {categoryId !== undefined && <input type="hidden" name="categoryId" value={categoryId} />}
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input id={id} name="name" required maxLength={MAX_NAME_LENGTH} className={`${inputClass} max-w-xs`} />
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

/** One Facet value: its name, Program count, and the rename, move, hide/show, and delete controls. */
export function ValueRow({ facet, value, first, last, indent = false }: {
  facet: FacetKey;
  value: AdminFacetValue;
  first: boolean;
  last: boolean;
  indent?: boolean;
}) {
  // One action for the row, so the row shows only the last message.
  const [state, action, pending] = useActionState(facetValueRowAction, idle);
  const unused = value.programCount === 0 && value.documentCount === 0;
  const hidden = (intent: string) => (
    <>
      <input type="hidden" name="facet" value={facet} />
      <input type="hidden" name="id" value={value.id} />
      <input type="hidden" name="intent" value={intent} />
    </>
  );
  const rowButton = (intent: string, text: string, label: string, disabled = false) => (
    <form action={action}>
      {hidden(intent)}
      <button type="submit" disabled={pending || disabled} aria-label={label} className={button}>
        {text}
      </button>
    </form>
  );

  return (
    <li className={`flex flex-col gap-2 border-b border-line py-3 last:border-b-0 ${indent ? "pl-6 sm:pl-10" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`font-semibold [overflow-wrap:anywhere] ${value.hidden ? "text-muted line-through" : ""}`}>{value.name}</span>
          {value.hidden && <Badge tone="warning">Hidden</Badge>}
          <span className="text-sm text-muted">
            {value.programCount} {value.programCount === 1 ? "Program" : "Programs"}
            {value.documentCount > 0 && `, ${value.documentCount} ${value.documentCount === 1 ? "Document" : "Documents"}`}
          </span>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <details>
            <summary className={summary}>Rename</summary>
            <form action={action} className="mt-2 flex flex-wrap gap-2">
              {hidden("rename")}
              <label className="sr-only" htmlFor={`rename-${facet}-${value.id}`}>
                New name for {value.name}
              </label>
              <input id={`rename-${facet}-${value.id}`} name="name" defaultValue={value.name} required maxLength={MAX_NAME_LENGTH} className={`${inputClass} max-w-xs`} />
              <button type="submit" disabled={pending} className={button}>
                Save
              </button>
            </form>
          </details>
          {rowButton("up", "↑", `Move ${value.name} up`, first)}
          {rowButton("down", "↓", `Move ${value.name} down`, last)}
          {rowButton(value.hidden ? "show" : "hide", value.hidden ? "Show" : "Hide", `${value.hidden ? "Show" : "Hide"} ${value.name}`)}
          {unused && (
            <form action={action} onSubmit={(event) => { if (!window.confirm(`Delete "${value.name}"? This cannot be undone.`)) event.preventDefault(); }}>
              {hidden("delete")}
              <button type="submit" disabled={pending} aria-label={`Delete ${value.name}`} className={buttonClass("danger", "sm")}>
                Delete
              </button>
            </form>
          )}
        </div>
      </div>
      <Message state={state} />
    </li>
  );
}
