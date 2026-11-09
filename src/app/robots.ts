import type { MetadataRoute } from "next";

/**
 * Do not disallow /embed: a blocked crawler cannot read its `noindex` tag, so the bare URL can still be
 * indexed. The pages' own robots metadata keeps /embed, /admin, and /login out of results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/"] },
  };
}
