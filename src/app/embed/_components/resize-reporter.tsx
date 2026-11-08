"use client";

import { useEffect } from "react";
import { EMBED_ROOT_ID, LOCATION_MESSAGE, RESIZE_MESSAGE, SCROLL_MESSAGE } from "@/embed/protocol";

/**
 * Runs inside the iframe. It tells the parent page (momsbloom.org) how tall our content is, so the
 * script on the parent page (public/embed.js) can set the iframe to that height.
 *
 * Why: an iframe does not grow by itself. Without this, the parent page would show a fixed-height
 * box with its own scroll bar, which is hard to use on a phone.
 *
 * It also tells the parent the shared part of the URL (`share`) and the open Program, so the parent can
 * show them in its own URL (ADR 0005). `share` never holds `near`, so the location stays in the iframe.
 *
 * How: a ResizeObserver calls `post` each time the root element changes size (for example, when a
 * filter shows fewer results). We measure the root element, not <html>, because <html> always fills
 * the full iframe height, so its height would never shrink.
 */
export function ResizeReporter({ share, program }: { share?: string; program?: string }) {
  useEffect(() => {
    // Not in an iframe (someone opened /embed directly): nobody to tell.
    if (window.parent === window) return;
    const root = document.getElementById(EMBED_ROOT_ID);
    if (!root) return;
    let last = -1;
    const post = () => {
      const height = Math.ceil(root.getBoundingClientRect().height);
      if (Math.abs(height - last) < 1) return; // no change, no message
      last = height;
      // Target "*": the height is not secret, and we cannot know the parent's origin for sure.
      // The parent script checks that the message comes from our iframe.
      window.parent.postMessage({ type: RESIZE_MESSAGE, height }, "*");
    };
    const observer = new ResizeObserver(post);
    observer.observe(root);
    post();
    // Then ask the host to scroll (after the resize message, so the height is set first): to the top
    // on the detail page, or to the card that the URL hash names when you come back to the results.
    // Neither: send nothing, so the first load of the host page does not jump.
    // Only a card ("#program-…") counts: "#filters" must never scroll the host. A malformed hash means no target.
    let target: HTMLElement | null = null;
    try {
      const hash = decodeURIComponent(location.hash.slice(1));
      if (hash.startsWith("program-")) target = document.getElementById(hash);
    } catch {}
    const top = root.hasAttribute("data-scroll-top") ? 0 : target ? Math.max(0, target.getBoundingClientRect().top - root.getBoundingClientRect().top) : null;
    if (top !== null) window.parent.postMessage({ type: SCROLL_MESSAGE, top }, "*");
    // The "Need more assistance?" link (#help): the iframe has no scroll bar, so the host page must scroll.
    // Only #help; "#filters" must never scroll the host.
    // A click listener, not `hashchange`: that does not fire when the hash is already #help.
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('a[href="#help"]')) return;
      const help = document.getElementById("help");
      if (help) window.parent.postMessage({ type: SCROLL_MESSAGE, top: Math.max(0, help.getBoundingClientRect().top - root.getBoundingClientRect().top) }, "*");
    };
    document.addEventListener("click", onClick);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
    };
  }, []);
  // Its own effect with its own deps: a filter change posts a location, and never re-runs the scroll above.
  useEffect(() => {
    // The error screen has no `share`: it sends no location.
    if (window.parent === window || share === undefined) return;
    // Target "*" is acceptable: the CSP `frame-ancestors` header (src/embed/frame-ancestors.ts) lets only
    // momsbloom.org frame this page, and the data holds no ZIP or location. The parent script checks the sender.
    window.parent.postMessage({ type: LOCATION_MESSAGE, search: share, program: program ?? null }, "*");
  }, [share, program]);
  return null;
}
