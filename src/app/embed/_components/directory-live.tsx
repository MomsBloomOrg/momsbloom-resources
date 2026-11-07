"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { parseDirectoryQuery, serializeDirectoryQuery } from "@/directory/query";

const KEYWORD_DEBOUNCE_MS = 250;
const roundTo2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The live layer on top of the server-rendered Directory. Without JavaScript, every control is a link
 * or a GET form and still works. With it, this component:
 * - turns form submits and "?..." link clicks into `router.replace` (no full reload, no scroll jump),
 * - submits the form 250 ms after the family stops typing a keyword, and on each checkbox change,
 * - keeps the old results on screen, faded, until the new ones arrive (`data-pending`),
 * - runs "Use my location" (refused: the cursor goes to the ZIP field).
 */
export function DirectoryLive({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  const navigate = (search: string) =>
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false }));

  // After a link click (a chip, Clear all) or Back, the server sends new `defaultChecked` values, but
  // the browser keeps what the family last clicked. Copy the server's values into the inputs.
  useEffect(() => {
    rootRef.current?.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") input.checked = input.defaultChecked;
      // A half-typed ZIP is not in the URL; keep it so the family can finish typing.
      else if (input !== document.activeElement && !(input.name === "zip" && input.value && !/^\d{5}$/.test(input.value)))
        input.value = input.defaultValue;
    });
  }, [searchParams]);

  useEffect(() => () => clearTimeout(debounce.current), []);

  const form = () => rootRef.current?.querySelector("form") ?? null;

  return (
    <div
      ref={rootRef}
      data-pending={isPending || undefined}
      className="group/live"
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(debounce.current);
        const params = new URLSearchParams();
        new FormData(event.target as HTMLFormElement).forEach((value, key) => params.append(key, String(value)));
        // Keep "Use my location" until the family types a ZIP code (the form has no `near` field).
        // An explicit Search (a submitter button) with a bad ZIP: pass the text on so the page shows the ZIP message.
        const rawZip = String(params.get("zip") ?? "");
        const explicit = (event.nativeEvent as SubmitEvent).submitter !== null;
        const near = searchParams.get("near");
        if (near && !params.get("zip")) params.set("near", near);
        const search = serializeDirectoryQuery(parseDirectoryQuery(params));
        const badZip = explicit && rawZip && !/^\d{5}$/.test(rawZip);
        navigate(badZip ? `${search}${search ? "&" : ""}zip=${encodeURIComponent(rawZip)}` : search);
      }}
      onInput={(event) => {
        const input = event.target as HTMLInputElement;
        if (input.name !== "q") return;
        clearTimeout(debounce.current);
        debounce.current = setTimeout(() => form()?.requestSubmit(), KEYWORD_DEBOUNCE_MS);
      }}
      onChange={(event) => {
        const input = event.target as HTMLInputElement;
        if (input.type === "checkbox" || input.type === "radio") form()?.requestSubmit();
      }}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-action=locate]")) {
          locate();
          return;
        }
        const link = target.closest("a");
        const href = link?.getAttribute("href");
        // Only our own "?..." links; let the browser handle new tabs and modified clicks.
        if (!href?.startsWith("?") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(href.slice(1));
      }}
    >
      {children}
    </div>
  );

  function locate() {
    const zipField = form()?.querySelector<HTMLInputElement>("input[name=zip]");
    if (!navigator.geolocation) {
      zipField?.focus();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const query = parseDirectoryQuery(new URLSearchParams(searchParams.toString()));
        if (zipField) zipField.value = "";
        // Rounded to 2 decimals (about 1 km): the URL never holds an exact home address.
        navigate(
          serializeDirectoryQuery({
            ...query,
            zip: null,
            near: { lat: roundTo2(coords.latitude), lng: roundTo2(coords.longitude) },
            pages: 1,
          }),
        );
      },
      () => zipField?.focus(), // Refused or failed: no error box, the cursor goes to the ZIP field.
    );
  }
}
