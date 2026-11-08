import Image from "next/image";
import { ChevronDown } from "lucide-react";
import logo from "./_brand/momsbloom-logo.webp";
import { Directory } from "./embed/_components/directory";

/** Block on the server and send the full HTML, so the page works without JavaScript (cacheComponents). */
export const instant = false;

/** The momsbloom.org top-level menu. Each item links to its section on the main site (no dropdowns yet). */
const NAV = [
  { label: "About", href: "https://www.momsbloom.org/about" },
  { label: "Services", href: "https://www.momsbloom.org/services" },
  { label: "Volunteer", href: "https://www.momsbloom.org/volunteer" },
  { label: "Events", href: "https://www.momsbloom.org/events" },
  { label: "Donate", href: "https://www.momsbloom.org/donate" },
];

/** A MomsBloom-style site header: logo and menu on white, with the green rule under it. */
function SiteHeader() {
  return (
    <header className="border-b-6 border-secondary bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-5">
        <a href="https://www.momsbloom.org">
          <Image src={logo} alt="MomsBloom" priority className="h-9 w-auto sm:h-11" />
        </a>
        <nav aria-label="MomsBloom" className="hidden md:block">
          <ul className="flex items-center gap-6">
            {NAV.map((item) => (
              <li key={item.label}>
                <a href={item.href} className="flex items-center gap-1 text-lg hover:text-primary-text">
                  {item.label}
                  <ChevronDown aria-hidden="true" className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/**
 * The standalone home page (https://resources.momsbloom.org/): the Directory under a MomsBloom site
 * header. Families normally see the Directory inside momsbloom.org/resources (see /embed).
 */
export default async function Home({ searchParams }: PageProps<"/">) {
  return (
    // overflow-x-clip: the full-width map row uses 100vw, which includes a classic scroll bar.
    <div className="overflow-x-clip">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pt-16 pb-12">
        <Directory params={await searchParams} />
      </main>
    </div>
  );
}
