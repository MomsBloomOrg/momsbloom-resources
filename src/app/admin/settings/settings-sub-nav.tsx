import Link from "next/link";

const LINKS = [
  { key: "filters", label: "Filter options", href: "/admin/settings/category" },
  { key: "custom-fields", label: "Custom fields", href: "/admin/settings/custom-fields" },
] as const;

/** The row above the header on both Settings pages: Filter options and Custom fields. */
export function SettingsSubNav({ current }: { current: (typeof LINKS)[number]["key"] }) {
  return (
    <nav aria-label="Settings" className="mb-6">
      <ul className="flex gap-2">
        {LINKS.map((l) => (
          <li key={l.key}>
            <Link
              href={l.href}
              aria-current={l.key === current ? "page" : undefined}
              className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 ${
                l.key === current ? "bg-ink font-semibold text-white" : "bg-field text-ink hover:bg-line"
              }`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
