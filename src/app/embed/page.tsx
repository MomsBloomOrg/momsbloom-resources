import type { Metadata } from "next";
import { EMBED_ROOT_ID } from "@/embed/protocol";
import { Directory } from "./_components/directory";

/** Embed pages are not for search engines. The momsbloom.org/resources page is the real page. */
export const metadata: Metadata = {
  title: "MomsBloom Resource Directory",
  robots: { index: false, follow: true },
};

/** Block on the server and send the full HTML, so the page works without JavaScript (cacheComponents). */
export const instant = false;

/**
 * The Directory, shown in an iframe on momsbloom.org/resources by `public/embed.js`.
 *
 * The element with id EMBED_ROOT_ID is the one that ResizeReporter measures. Keep all content inside it.
 */
export default async function EmbedPage({ searchParams }: PageProps<"/embed">) {
  return (
    <main id={EMBED_ROOT_ID} className="mx-auto w-full max-w-6xl px-4 py-8">
      <Directory params={await searchParams} embed />
    </main>
  );
}
