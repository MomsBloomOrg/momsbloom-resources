import type { Metadata } from "next";
import { EMBED_ROOT_ID } from "@/embed/protocol";
import { ResizeReporter } from "./_components/resize-reporter";

/** Embed pages are not for search engines. The momsbloom.org/resources page is the real page. */
export const metadata: Metadata = {
  title: "MomsBloom Resource Directory",
  robots: { index: false, follow: true },
};

/**
 * The page that `public/embed.js` shows in an iframe on momsbloom.org/resources.
 *
 * For now it is a "hello" page that proves the hosting path works: Vercel serves it, the Squarespace
 * page frames it, and the iframe height follows the content (no second scroll bar).
 * The directory (search, filters, results) will replace the content of <main>.
 *
 * The element with id EMBED_ROOT_ID is the one that ResizeReporter measures. Keep all content inside it.
 */
export default function EmbedPage() {
  return (
    <main id={EMBED_ROOT_ID} className="w-full p-4">
      <p className="text-sm font-bold uppercase tracking-wide text-muted">Located in Kent County</p>
      <h1 className="mt-1 text-3xl font-extrabold">Postpartum Resources</h1>
      <p className="mt-3">
        Hello from Vercel. If you can read this on momsbloom.org, the embed works. This box has no
        scroll bar of its own: the page grows to fit it.
      </p>
      <a
        href="https://momsbloom.org"
        target="_blank"
        rel="noopener"
        className="mt-4 inline-block rounded-full bg-primary-text px-5 py-2 font-bold text-white hover:bg-primary-hover"
      >
        A test button
      </a>
      <ResizeReporter />
    </main>
  );
}
