"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

const TRIGGER = "[data-action=open-filters]";

/**
 * The mobile filter sheet. It holds the one and only FilterColumn: on desktop, and with JavaScript
 * off, the <dialog> is never opened and shows as a normal block (the column). Below `md`, with
 * JavaScript, the "Filters" link opens it with showModal(): top layer, the page behind is inert,
 * Escape closes, focus stays inside. One copy of the checkboxes, so only one set submits with the form.
 *
 * Inside the iframe, the iframe is as tall as its content, so `bottom: 0` would be the bottom of the
 * iframe, not the phone screen. On open, an IntersectionObserver gives the part of the page that is
 * on screen (clipped to the host page viewport, also cross-origin), and the sheet fills that part.
 * shortcut: the host page is not inert, so a scroll outside the sheet moves it away with the iframe;
 * upgrade to an `overlay` embed message (embed.js makes the iframe full-screen) if families hit this.
 */
export function FilterSheet({ total, clearAllHref, children }: { total: number; clearAllHref: string | null; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // From now on the "Filters" link opens the sheet, so hide the column at the bottom of the phone page.
    dialog.dataset.js = "";
    const open = (event: MouseEvent) => {
      if (!(event.target as Element).closest(TRIGGER) || dialog.open) return;
      event.preventDefault();
      const observer = new IntersectionObserver(([entry]) => {
        observer.disconnect();
        if (dialog.open) return; // a double tap queues two observers
        const { top, height } = entry.intersectionRect;
        dialog.style.setProperty("--sheet-top", `${top}px`);
        dialog.style.setProperty("--sheet-height", `${height || window.innerHeight}px`);
        dialog.showModal();
      });
      observer.observe(document.documentElement);
    };
    document.addEventListener("click", open);
    return () => document.removeEventListener("click", open);
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby="filters-heading"
      // Safari does not focus a tapped link, so the native focus return is not enough.
      onClose={() => document.querySelector<HTMLElement>(TRIGGER)?.focus()}
      className="group/sheet static m-0 block h-auto max-h-none w-auto max-w-none border-0 bg-transparent p-0 text-inherit max-md:data-js:not-open:hidden open:fixed open:inset-x-0 open:top-[calc(var(--sheet-top)+1rem)] open:bottom-auto open:flex open:h-[calc(var(--sheet-height)-1rem)] open:w-full open:flex-col open:overflow-hidden open:rounded-t-2xl open:bg-surface open:motion-safe:animate-[sheet-up_200ms_ease-out] backdrop:bg-ink/60"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close filters"
        className="absolute top-2 right-2 z-20 hidden size-11 items-center justify-center rounded-full bg-surface group-open/sheet:flex"
      >
        <X aria-hidden="true" className="size-6" />
      </button>
      <div className="group-open/sheet:flex-1 group-open/sheet:overflow-y-auto group-open/sheet:overscroll-contain">{children}</div>
      <div className="hidden items-center gap-4 border-t border-line p-4 group-open/sheet:flex">
        {/* The page's result line is inert behind the modal, so the sheet announces the count itself. */}
        <span aria-live="polite" className="sr-only">
          {total} {total === 1 ? "result" : "results"}
        </span>
        {clearAllHref && (
          <a href={clearAllHref} className="flex min-h-11 items-center px-2 font-bold text-primary-text underline">
            Clear all
          </a>
        )}
        <button
          type="button"
          onClick={close}
          className="min-h-12 flex-1 rounded-full bg-primary-text px-6 font-bold text-white hover:bg-primary-hover"
        >
          Show {total} {total === 1 ? "result" : "results"}
        </button>
      </div>
    </dialog>
  );
}
