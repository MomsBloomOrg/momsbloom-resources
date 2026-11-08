/**
 * The Directory heading text. Cached until an Admin save calls `directoryChanged()` (tag "directory").
 * Sample-data mode (e2e) returns the defaults and reads no database.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DIRECTORY_HEADING_DEFAULTS, getDirectoryHeadingContent, type DirectoryHeadingContent } from "@/admin/directory-heading";
import { getDb } from "@/db";

export async function loadDirectoryHeadingContent(): Promise<DirectoryHeadingContent> {
  if (process.env.DIRECTORY_SAMPLE_DATA === "1" && process.env.VERCEL_ENV !== "production") return DIRECTORY_HEADING_DEFAULTS;
  // A failed read must not take the Directory down. The error is thrown outside the cache, so the defaults
  // are not cached and the next request tries again.
  try {
    return await cachedContent();
  } catch (error) {
    console.error("Directory heading content failed to load; showing the defaults.", error);
    return DIRECTORY_HEADING_DEFAULTS;
  }
}

async function cachedContent(): Promise<DirectoryHeadingContent> {
  "use cache";
  cacheTag("directory");
  cacheLife("max");
  return getDirectoryHeadingContent(getDb());
}
