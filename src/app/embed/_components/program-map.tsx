"use client";

import { useEffect, useRef } from "react";

export interface MapProgram {
  id: string;
  /** The number on the pin and on the card. */
  number: number;
  name: string;
  organizationName: string;
  distanceMiles: number | null;
  lat: number;
  lng: number;
  detailsHref: string;
  directionsHref: string;
}

const PIN_CLASS =
  "flex size-8 items-center justify-center rounded-full border-2 border-primary-text bg-white text-sm font-bold text-primary-text shadow data-[active]:bg-primary-text data-[active]:text-white";

const cardOf = (id: string) => document.getElementById(`program-${id}`);

/**
 * The map in map view. One numbered pin for each point (Programs at the same address share a pin).
 * It fits the pins and never centers on the family's ZIP code or location (spec, "Map view").
 * Leaflet is loaded here, in the browser, only when the map shows.
 *
 * `compact` is the small map on the detail page: one pin, no popup, no card highlight, zoom 15.
 *
 * The container has a fixed pixel height: the iframe grows to fit its content, so a height in
 * `vh` or `h-full` would grow the iframe without end.
 */
export function ProgramMap({ programs, compact = false }: { programs: MapProgram[]; compact?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  // shortcut: the map is rebuilt when the shown Programs change; fine for 10 to 30 pins, keep one map if it feels slow.
  const key = JSON.stringify(programs);

  useEffect(() => {
    const element = container.current;
    if (!element || programs.length === 0) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled) return;

      const map = L.map(element, {
        keyboard: !compact, // the compact pin does nothing, so it is not a tab stop
        scrollWheelZoom: false, // the iframe must not trap the host page scroll
        dragging: !L.Browser.mobile, // one finger scrolls the page on phones; +/- and pins still work
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const points = new Map<string, MapProgram[]>();
      for (const program of programs) {
        const at = `${program.lat},${program.lng}`;
        points.set(at, [...(points.get(at) ?? []), program]);
      }

      const pins = new Map<string, HTMLElement>(); // program id -> its pin
      const activate = (ids: string[], on: boolean) => {
        for (const id of ids) {
          cardOf(id)?.toggleAttribute("data-active", on);
          pins.get(id)?.toggleAttribute("data-active", on);
        }
      };
      let selected: string[] = [];

      for (const group of points.values()) {
        const ids = group.map((program) => program.id);
        const pin = document.createElement("span");
        pin.className = PIN_CLASS;
        // "2+" for a shared pin: it is not only card 2.
        if (!compact) pin.textContent = `${group[0].number}${group.length > 1 ? "+" : ""}`; // compact: a plain dot
        const marker = L.marker([group[0].lat, group[0].lng], {
          icon: L.divIcon({ html: pin, className: "", iconSize: [32, 32] }),
          keyboard: !compact,
          title: group.map((program) => program.name).join(", "),
        });
        // The icon element exists only once the map has a view, so label it on "add" (then addTo).
        marker.on("add", () => marker.getElement()?.setAttribute("aria-label", group.map((program) => program.name).join(", ")));
        marker.addTo(map);
        for (const id of ids) pins.set(id, pin);
        if (compact) continue;

        const popup = document.createElement("div");
        for (const program of group) {
          const item = document.createElement("div");
          item.className = "mb-2 last:mb-0";
          const title = document.createElement("strong");
          title.textContent = `${program.number}. ${program.name}`;
          const meta = document.createElement("div");
          meta.textContent = [
            program.organizationName,
            program.distanceMiles !== null && `${program.distanceMiles} mi`,
          ]
            .filter(Boolean)
            .join(" · ");
          const links = document.createElement("div");
          for (const [text, href, newTab] of [
            ["View details", program.detailsHref, false],
            ["Get directions", program.directionsHref, true],
          ] as const) {
            const a = document.createElement("a");
            a.href = href;
            a.textContent = text;
            a.className = "mr-3 font-bold text-primary-text underline";
            if (text === "Get directions") {
              a.dataset.event = "program_directions";
              a.dataset.programId = program.id;
            }
            if (newTab) {
              a.target = "_blank";
              a.rel = "noopener";
            }
            links.append(a);
          }
          item.append(title, meta, links);
          popup.append(item);
        }
        marker.bindPopup(popup);
        marker.on("click", () => {
          activate(selected, false);
          selected = ids;
          activate(ids, true);
        });
        marker.on("popupclose", () => {
          activate(selected, false);
          selected = [];
        });
      }

      const bounds = L.latLngBounds(
        programs.map(
          (program) => [program.lat, program.lng] as [number, number],
        ),
      );
      if (compact) {
        map.setView(bounds.getCenter(), 15);
        cleanup = () => map.remove();
        return;
      }
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

      // Hover or focus on a card highlights its pin (one listener each, by `program-<id>`).
      const hover = (on: boolean) => (event: Event) => {
        const id = (event.target as HTMLElement)
          .closest("article[id^=program-]")
          ?.id.slice("program-".length);
        const pin = id ? pins.get(id) : undefined;
        if (pin)
          pin.toggleAttribute("data-active", on || selected.includes(id!));
      };
      const over = hover(true);
      const out = hover(false);
      document.addEventListener("mouseover", over);
      document.addEventListener("focusin", over);
      document.addEventListener("mouseout", out);
      document.addEventListener("focusout", out);

      cleanup = () => {
        document.removeEventListener("mouseover", over);
        document.removeEventListener("focusin", over);
        document.removeEventListener("mouseout", out);
        document.removeEventListener("focusout", out);
        activate(selected, false);
        map.remove();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `programs`
  }, [key]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={compact ? "Map of the location" : "Map of the places in the results"}
      data-testid="program-map"
      className={`w-full rounded-2xl border border-line ${compact ? "h-[200px]" : "h-80 lg:h-[640px]"}`}
    />
  );
}
