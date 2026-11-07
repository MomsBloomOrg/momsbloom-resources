import type { NextConfig } from "next";
import { embedFrameAncestors, NO_FRAME_ANCESTORS } from "./src/embed/frame-ancestors";

const nextConfig: NextConfig = {
  // "use cache" for the Directory snapshot (src/directory/snapshot.ts).
  cacheComponents: true,
  // Off: the first request for a Program waits for the full page instead of sending a shell first.
  partialPrefetching: false,
  async headers() {
    // Map view loads tiles from https://tile.openstreetmap.org (img). The only CSP directive today is
    // frame-ancestors; if anyone adds default-src or img-src, it must allow that host.
    // When two rules set the same header, the last one wins: the embed rule must come last.
    // `/embed/:path*` also matches `/embed` itself.
    return [
      { source: "/:path*", headers: [{ key: "Content-Security-Policy", value: NO_FRAME_ANCESTORS }] },
      {
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: embedFrameAncestors(process.env.EMBED_EXTRA_FRAME_ANCESTORS) },
        ],
      },
      // A change to the embed script reaches momsbloom.org within 5 minutes (browsers cache it that long).
      { source: "/embed.js", headers: [{ key: "Cache-Control", value: "public, max-age=300" }] },
    ];
  },
  // Tailwind 4 runs as a Turbopack loader for CSS files (the same setup as bikegr-calendar).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
