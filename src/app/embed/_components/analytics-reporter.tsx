"use client";

import { useEffect, useRef } from "react";
import { FACET_URL_KEYS } from "@/directory/query";
import { EVENT_MESSAGE, HOST_CUSTOM_KEY, MAX_PARAM_LENGTH, eventText, safeKeyword } from "@/embed/protocol";

/** Wait this long after the last change before a search counts, so "yo", "yog", "yoga" send one event. */
const SETTLE_MS = 1_000;

type Params = Record<string, string | number>;

/** Tells the host page about an event (ADR 0006). `embed.js` calls the host page's own gtag(). Nothing else leaves. */
function send(name: string, params: Params) {
  if (window.parent === window) return;
  // Target "*", as in ResizeReporter: the CSP `frame-ancestors` list limits who can frame us, and the
  // data holds no ZIP, location, or free text except the (redacted) keyword.
  window.parent.postMessage({ type: EVENT_MESSAGE, name, params }, "*");
}

/**
 * Runs inside the iframe. Sends the analytics events: the search events on the results page (`search`),
 * `program_view` on the detail page (`programId`), `organization_view` on the Organization page (`organizationId`), `directory_filter` for a checked Facet value, and the
 * click events for links with a `data-event` attribute. It returns nothing to draw.
 */
export function AnalyticsReporter({
  search,
  programId,
  programName,
  organizationId,
  organizationName,
}: {
  search?: { q: string; total: number; filters: string };
  programId?: string;
  programName?: string;
  organizationId?: string;
  organizationName?: string;
}) {
  // The search key changes when the family searches. A shared link, a reload, or "Back to results" is
  // the start state, not a search, so it sends nothing. A ref (not state) keeps Strict Mode's second effect quiet.
  const key = search ? JSON.stringify(search) : null;
  const initial = useRef(key);
  const changed = useRef(false);
  const sentQ = useRef(search?.q ?? ""); // the keyword of the last directory_search (or of the start state)
  useEffect(() => {
    if (!search) return;
    if (key !== initial.current) changed.current = true;
    if (!changed.current) return;
    // shortcut: a search is lost if the family leaves the page within 1 s; add a `pagehide` flush if the numbers look low.
    const timer = setTimeout(() => {
      const term: Params = search.q ? { search_term: safeKeyword(search.q) } : {};
      // A filter toggle with the same keyword is not a new keyword search (zero results below can still send).
      if (search.q && search.q !== sentQ.current) send("directory_search", { ...term, result_count: search.total });
      sentQ.current = search.q;
      if (search.total === 0) {
        const filters: Params = search.filters ? { filters: search.filters.slice(0, MAX_PARAM_LENGTH) } : {};
        send("directory_zero_results", { ...term, ...filters });
      }
    }, SETTLE_MS);
    return () => clearTimeout(timer);
    // `search` is a new object on each render; `key` holds its content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (programId) send("program_view", { program_id: programId, ...(programName && { program_name: eventText(programName) }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  useEffect(() => {
    if (organizationId) send("organization_view", { organization_id: organizationId, ...(organizationName && { organization_name: eventText(organizationName) }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  useEffect(() => {
    // The host page does not navigate when a link is clicked in the iframe, so nothing can block: no preventDefault, no wait.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[data-event]");
      const name = link?.getAttribute("data-event");
      if (!link || !name) return;
      const programId = link.getAttribute("data-program-id");
      const documentId = link.getAttribute("data-document-id");
      const programName = link.getAttribute("data-program-name");
      const documentTitle = link.getAttribute("data-document-title");
      if (programId) send(name, { program_id: programId, ...(programName && { program_name: eventText(programName) }) });
      else if (documentId) send(name, { document_id: documentId, ...(documentTitle && { document_title: eventText(documentTitle) }) });
    };
    const facetOf = new Map(Object.entries(FACET_URL_KEYS).map(([facet, urlKey]) => [urlKey, facet]));
    const onChange = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "checkbox" || !input.checked) return;
      // Custom field filters report their URL key (cf12) as the group, like the Facets report theirs.
      const group = facetOf.get(input.name) ?? (HOST_CUSTOM_KEY.test(input.name) ? input.name : undefined);
      if (group) send("directory_filter", { filter_group: group, filter_value: input.value.slice(0, MAX_PARAM_LENGTH) });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("change", onChange);
    };
  }, []);

  return null;
}
