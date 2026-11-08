"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useId, useOptimistic, useState, useTransition } from "react";
import type { FeaturedProgram } from "@/admin/programs";
import { reorderFeaturedProgramsAction, type ReorderFeaturedState } from "../programs/actions";
import { Message } from "../settings/facet-forms";
import { Badge, Card, hintClass, sectionTitle, type BadgeTone } from "./ui";

export type FeaturedRow = FeaturedProgram & { tone: BadgeTone };

const screenReaderInstructions = {
  draggable:
    "To move this Program, press Space or Enter. Use the up and down arrow keys to move it, then press Space or Enter to drop it. Press Escape to cancel. You can also use the Move up and Move down buttons.",
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink";
const iconButton = `inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-field aria-disabled:cursor-not-allowed aria-disabled:opacity-40 ${focusRing}`;

/**
 * The featured Programs on the Admin home, in rank order. Staff reorder them by drag and drop (mouse,
 * touch, or keyboard) or with Move up and Move down, like Facet values in Settings. The new order
 * shows at once; if the save is refused or fails, the list goes back and the message shows.
 */
export function FeaturedPrograms({ programs }: { programs: FeaturedRow[] }) {
  // The optimistic order ends with the transition: then `programs` is the saved order (or the old one).
  const [items, setItems] = useOptimistic(programs);
  const [state, setState] = useState<ReorderFeaturedState>({ result: "idle" });
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dndId = useId();
  const router = useRouter();

  const nameOf = (id: UniqueIdentifier) => items.find((p) => p.id === id)?.name ?? "";
  const position = (id: UniqueIdentifier) => `position ${items.findIndex((p) => p.id === id) + 1} of ${items.length}`;
  const announcements = {
    onDragStart: ({ active }: { active: { id: UniqueIdentifier } }) => `Picked up ${nameOf(active.id)}, in ${position(active.id)}.`,
    onDragOver: ({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) =>
      over ? `${nameOf(active.id)} is in ${position(over.id)}.` : `${nameOf(active.id)} is outside the list.`,
    onDragEnd: ({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) =>
      over ? `Dropped ${nameOf(active.id)} in ${position(over.id)}.` : `Dropped ${nameOf(active.id)}. The order did not change.`,
    onDragCancel: ({ active }: { active: { id: UniqueIdentifier } }) => `Cancelled. ${nameOf(active.id)} is back in ${position(active.id)}.`,
  };

  function save(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) return;
    const next = arrayMove(items, from, to);
    const moved = `${items[from].name} moved to position ${to + 1} of ${items.length}.`;
    setState({ result: "idle" }); // An old message must not stay while this save runs.
    startTransition(async () => {
      setItems(next);
      try {
        const result = await reorderFeaturedProgramsAction(next.map((p) => p.id));
        setState(result.result === "ok" ? { result: "ok", message: moved } : result);
        // Refused (the list changed): load the saved list again.
        if (result.result === "error") router.refresh();
      } catch (error) {
        unstable_rethrow(error); // Next.js redirects (an expired login) must go through.
        setState({ result: "error", message: "The new order was not saved. Try again." });
      }
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    save(items.findIndex((p) => p.id === active.id), items.findIndex((p) => p.id === over.id));
  }

  return (
    <Card title={sectionTitle("Featured programs")} className="mb-8">
      <p className={`${hintClass} mb-3`}>Families see these Programs first, in this order. Check or uncheck Featured on a Program to change the list.</p>
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements, screenReaderInstructions }}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ol>
            {items.map((program, index) => (
              <FeaturedRowItem key={program.id} program={program} index={index} last={index === items.length - 1} onMove={(to) => save(index, to)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <Message state={state} />
    </Card>
  );
}

function FeaturedRowItem({ program, index, last, onMove }: { program: FeaturedRow; index: number; last: boolean; onMove: (to: number) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: program.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line py-2 last:border-b-0 ${isDragging ? "relative z-20 rounded-2xl bg-surface px-2 shadow-lg" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="w-6 text-right text-sm text-muted">{index + 1}</span>
        <div className="min-w-0">
          <Link href={`/admin/programs/${program.id}`} className="font-semibold underline decoration-1 underline-offset-4 [overflow-wrap:anywhere] hover:text-primary-text">
            {program.name}
          </Link>
          <div className="text-sm text-muted">{program.organizationName}</div>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Badge tone={program.tone}>{program.statusName}</Badge>
        {/* aria-disabled, not disabled: a button that becomes disabled while focused drops the focus to the page. save() ignores an out-of-range move. */}
        <button type="button" aria-disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${program.name} up`} className={iconButton}>
          <ArrowUp aria-hidden size={18} />
        </button>
        <button type="button" aria-disabled={last} onClick={() => onMove(index + 1)} aria-label={`Move ${program.name} down`} className={iconButton}>
          <ArrowDown aria-hidden size={18} />
        </button>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${program.name} to reorder`}
          className={`${iconButton} cursor-grab touch-none active:cursor-grabbing`}
        >
          <GripVertical aria-hidden size={20} />
        </button>
      </div>
    </li>
  );
}
