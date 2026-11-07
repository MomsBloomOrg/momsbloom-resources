"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const LINKS = [
  { href: "/admin", label: "Organizations", match: ["/admin", "/admin/organizations", "/admin/programs"] },
  { href: "/admin/documents", label: "Documents", match: ["/admin/documents"] },
  { href: "/admin/settings/category", label: "Settings", match: ["/admin/settings"] },
  { href: "/admin/staff-admins", label: "Staff admins", match: ["/admin/staff-admins"] },
];

/**
 * Focus the visible h1 in `main` (the router can keep an earlier page hidden in the DOM). True if
 * there is one.
 */
function focusHeading(main: HTMLElement): boolean {
  const h1 = Array.from(main.querySelectorAll<HTMLElement>("h1")).find((el) => el.getClientRects().length > 0);
  if (!h1) return false;
  if (!h1.hasAttribute("tabindex")) h1.tabIndex = -1;
  h1.focus({ preventScroll: true });
  return true;
}

/**
 * The Admin nav. The link of the current section has `aria-current="page"`. After each client-side
 * navigation to a new path, focus moves to the new page's h1 (or to `<main id="admin-main">` until the
 * h1 shows), so a screen reader reads the page title and the next Tab goes into the page. A query
 * change (search, filters) keeps the path and does not move focus.
 */
export function AdminNavLinks() {
  const pathname = usePathname();
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const main = document.getElementById("admin-main");
    if (!main) return;
    if (focusHeading(main)) return;
    // The h1 can stream in later (inside Suspense). Focus <main> now, then the h1 when it shows, but
    // only while the focus is still on <main> (the user did not move it).
    main.focus({ preventScroll: true });
    const observer = new MutationObserver(() => {
      if (document.activeElement !== main || focusHeading(main)) observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    const timer = setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <nav aria-label="Admin" className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
      {LINKS.map((link) => {
        // "/admin" itself matches only exactly, or every Admin page would count as Organizations.
        const current = link.match.some((m) => pathname === m || (m !== "/admin" && pathname.startsWith(`${m}/`)));
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`flex min-h-11 items-center border-b-[3px] pb-1 ${
              current
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-ink hover:border-ink/40"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
