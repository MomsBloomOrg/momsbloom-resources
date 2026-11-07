/**
 * The help box text for the Directory pages. Cached until an Admin save calls `directoryChanged()`
 * (tag "directory"). Sample-data mode (e2e) returns the defaults and reads no database.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getHelpBoxContent, HELP_BOX_DEFAULTS, type HelpBoxContent } from "@/admin/help-box";
import { getDb } from "@/db";

export async function loadHelpBoxContent(): Promise<HelpBoxContent> {
  if (process.env.DIRECTORY_SAMPLE_DATA === "1" && process.env.VERCEL_ENV !== "production") return HELP_BOX_DEFAULTS;
  // A failed read (for example `site_content` is not migrated yet) must not take the Directory down. The
  // error is thrown outside the cache, so the defaults are not cached and the next request tries again.
  try {
    return await cachedContent();
  } catch (error) {
    console.error("Help box content failed to load; showing the defaults.", error);
    return HELP_BOX_DEFAULTS;
  }
}

async function cachedContent(): Promise<HelpBoxContent> {
  "use cache";
  cacheTag("directory");
  cacheLife("max");
  return getHelpBoxContent(getDb());
}
