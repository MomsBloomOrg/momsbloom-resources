"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronRight } from "lucide-react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useId, useOptimistic, useState, useTransition } from "react";
import type { AdminFacetValue, FacetKey } from "@/admin/facets";
import { reorderFacetValuesAction, type FacetFormState } from "./actions";
import { AddValueForm, Message, ValueRow } from "./facet-forms";

const screenReaderInstructions = {
  draggable:
    "To move this value, press Space or Enter. Use the up and down arrow keys to move it, then press Space or Enter to drop it. Press Escape to cancel. You can also use Move up and Move down in the More actions menu.",
};

/**
 * One list of Facet values that staff reorder by drag and drop (mouse, touch, or keyboard). The new
 * order shows at once; if the save is refused or fails, the list goes back and the message shows. For
 * Categories, `subcategories` puts each Category's Subcategories in a closed group under it.
 */
export function SortableValues({ facet, values, categoryId, subcategories }: {
  facet: FacetKey;
  values: AdminFacetValue[];
  categoryId?: number;
  subcategories?: AdminFacetValue[];
}) {
  // The optimistic order ends with the transition: then `values` is the saved order (or the old one).
  const [items, setItems] = useOptimistic(values);
  const [state, setState] = useState<FacetFormState>({ result: "idle" });
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dndId = useId();
  const router = useRouter();

  const nameOf = (id: UniqueIdentifier) => items.find((v) => v.id === id)?.name ?? "";
  const position = (id: UniqueIdentifier) => `position ${items.findIndex((v) => v.id === id) + 1} of ${items.length}`;
  const announcements = {
    onDragStart: ({ active }: { active: { id: UniqueIdentifier } }) => `Picked up ${nameOf(active.id)}, in ${position(active.id)}.`,
    onDragOver: ({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) =>
      over ? `${nameOf(active.id)} is in ${position(over.id)}.` : `${nameOf(active.id)} is outside the list.`,
    onDragEnd: ({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) =>
      over ? `Dropped ${nameOf(active.id)} in ${position(over.id)}.` : `Dropped ${nameOf(active.id)}. The order did not change.`,
    onDragCancel: ({ active }: { active: { id: UniqueIdentifier } }) => `Cancelled. ${nameOf(active.id)} is back in ${position(active.id)}.`,
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const next = arrayMove(items, items.findIndex((v) => v.id === active.id), items.findIndex((v) => v.id === over.id));
    startTransition(async () => {
      setItems(next);
      try {
        const result = await reorderFacetValuesAction(facet, categoryId, next.map((v) => v.id));
        setState(result);
        // Refused (for example, the list changed): load the saved list again.
        if (result.result === "error") router.refresh();
      } catch (error) {
        unstable_rethrow(error); // Next.js redirects (an expired login) must go through.
        setState({ result: "error", message: "The new order was not saved. Try again." });
      }
    });
  }

  return (
    <>
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements, screenReaderInstructions }}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ul>
            {items.map((value, index) => {
              const children = subcategories?.filter((sub) => sub.categoryId === value.id);
              return (
                <ValueRow key={value.id} facet={facet} value={value} first={index === 0} last={index === items.length - 1}>
                  {children && (
                    <details className="group pb-3 pl-6 sm:pl-10">
                      <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-1 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                        <ChevronRight aria-hidden size={16} className="transition-transform group-open:rotate-90" />
                        {children.length} {children.length === 1 ? "Subcategory" : "Subcategories"}
                      </summary>
                      {children.length > 0 && <SortableValues facet="subcategory" categoryId={value.id} values={children} />}
                      <div className="pt-3">
                        <AddValueForm facet="subcategory" categoryId={value.id} label={`New Subcategory of ${value.name}`} />
                      </div>
                    </details>
                  )}
                </ValueRow>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>
      <Message state={state} />
    </>
  );
}
