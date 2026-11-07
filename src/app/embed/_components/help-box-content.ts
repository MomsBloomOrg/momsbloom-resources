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
  return cachedContent();
}

async function cachedContent(): Promise<HelpBoxContent> {
  "use cache";
  cacheTag("directory");
  cacheLife("max");
  return getHelpBoxContent(getDb());
}
