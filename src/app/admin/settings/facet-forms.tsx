"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ellipsis, GripVertical } from "lucide-react";
import { useActionState, type KeyboardEvent, type ReactNode } from "react";
import type { AdminFacetValue, FacetKey } from "@/admin/facets";
import { Badge, buttonClass, inputClass, labelClass } from "../_components/ui";
import { addFacetValueAction, facetValueRowAction, type FacetFormState } from "./actions";

const idle: FacetFormState = { result: "idle" };
const MAX_NAME_LENGTH = 100;
// Rows sit on the grey `field` panel: text is `ink`, never `primary-text` (below 4.5:1 there).
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";
const iconButton = `inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-surface ${focusRing}`;
const textButton = `min-h-9 rounded-full px-3 text-sm font-semibold text-ink underline decoration-1 underline-offset-2 hover:decoration-2 disabled:opacity-60 ${focusRing}`;
const menuItem = `w-full rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-field disabled:cursor-not-allowed disabled:text-muted ${focusRing}`;

export function Message({ state }: { state: FacetFormState }) {
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

/** Closes an open "More actions" menu on Escape and puts the focus back on its button. */
function closeOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
  if (event.key !== "Escape" || !event.currentTarget.open) return;
  event.currentTarget.open = false;
  event.currentTarget.querySelector("summary")?.focus();
}

/**
 * One Facet value: name, Hidden badge, and counts on the left; the drag handle, Hide/Show, and a
 * "More actions" menu (Rename, Move up, Move down, Delete) on the right. Move up and Move down are
 * the way to reorder without dragging (WCAG 2.5.7). `children` shows under the row (a Category's
 * Subcategories). Must be inside a `SortableContext`.
 */
export function ValueRow({ facet, value, first, last, children }: {
  facet: FacetKey;
  value: AdminFacetValue;
  first: boolean;
  last: boolean;
  children?: ReactNode;
}) {
  // One action for the row, so the row shows only the last message.
  const [state, action, pending] = useActionState(facetValueRowAction, idle);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: value.id });
  const unused = value.programCount === 0 && value.documentCount === 0;
  const hidden = (intent: string) => (
    <>
      <input type="hidden" name="facet" value={facet} />
      <input type="hidden" name="id" value={value.id} />
      <input type="hidden" name="intent" value={intent} />
    </>
  );
  const menuButton = (intent: string, text: string, disabled = false) => (
    <form action={action}>
      {hidden(intent)}
      <button type="submit" disabled={pending || disabled} className={menuItem}>
        {text}
      </button>
    </form>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`border-b border-line last:border-b-0 ${isDragging ? "relative z-20 rounded-2xl bg-surface px-2 shadow-lg" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <span className={`font-semibold [overflow-wrap:anywhere] ${value.hidden ? "text-muted line-through" : ""}`}>{value.name}</span>
          {value.hidden && <Badge tone="warning">Hidden</Badge>}
          <span className="text-sm text-muted">
            {value.programCount} {value.programCount === 1 ? "Program" : "Programs"}
            {value.documentCount > 0 && `, ${value.documentCount} ${value.documentCount === 1 ? "Document" : "Documents"}`}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag ${value.name} to reorder`}
            className={`${iconButton} cursor-grab touch-none active:cursor-grabbing`}
          >
            <GripVertical aria-hidden size={20} />
          </button>
          <form action={action}>
            {hidden(value.hidden ? "show" : "hide")}
            <button type="submit" disabled={pending} aria-label={`${value.hidden ? "Show" : "Hide"} ${value.name}`} className={textButton}>
              {value.hidden ? "Show" : "Hide"}
            </button>
          </form>
          <details className="relative" onKeyDown={closeOnEscape}>
            <summary aria-label={`More actions for ${value.name}`} className={`${iconButton} list-none [&::-webkit-details-marker]:hidden`}>
              <Ellipsis aria-hidden size={20} />
            </summary>
            <div className="absolute right-0 top-full z-10 mt-1 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-2xl border border-line bg-surface p-3 text-ink shadow-lg">
              <form action={action} className="mb-2 flex flex-col gap-1 border-b border-line pb-3">
                {hidden("rename")}
                <label className="text-sm font-semibold" htmlFor={`rename-${facet}-${value.id}`}>
                  Rename {value.name}
                </label>
                <div className="flex gap-2">
                  <input id={`rename-${facet}-${value.id}`} name="name" defaultValue={value.name} required maxLength={MAX_NAME_LENGTH} className={inputClass} />
                  <button type="submit" disabled={pending} className={buttonClass("secondary", "sm")}>
                    Save
                  </button>
                </div>
              </form>
              {menuButton("up", "Move up", first)}
              {menuButton("down", "Move down", last)}
              {unused && (
                <form action={action} onSubmit={(event) => { if (!window.confirm(`Delete "${value.name}"? This cannot be undone.`)) event.preventDefault(); }}>
                  {hidden("delete")}
                  <button type="submit" disabled={pending} className={`${menuItem} text-red-700`}>
                    Delete
                  </button>
                </form>
              )}
            </div>
          </details>
        </div>
      </div>
      <Message state={state} />
      {children}
    </li>
  );
}
