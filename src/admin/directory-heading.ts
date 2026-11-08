/**
 * Admin: the Directory heading and subheading (/admin/content). Takes a `Db`, so PGlite tests can run it.
 * Same rules as the help box: one `site_content` row per field, a blank field shows the default.
 */
import type { Db } from "@/db/types";
import { getSiteContent, saveSiteContent, type SiteContentResult } from "./site-content";

export interface DirectoryHeadingContent {
  heading: string;
  /** Plain text. The "Need more assistance?" link always follows it. */
  subheading: string;
}

export type DirectoryHeadingField = keyof DirectoryHeadingContent;

export const DIRECTORY_HEADING_DEFAULTS: DirectoryHeadingContent = {
  heading: "Pregnancy & Postpartum Resources",
  subheading: "Local support, services, and resources for families in Kent County, Michigan.",
};

export const DIRECTORY_HEADING_FIELDS = Object.keys(DIRECTORY_HEADING_DEFAULTS) as DirectoryHeadingField[];

const KEY_PREFIX = "directory_heading.";
const LABELS: Record<DirectoryHeadingField, string> = { heading: "Heading", subheading: "Subheading" };
// 80: the h1 stays at 2 lines or fewer. 250: the subheading stays at 3 lines or fewer.
const MAX_LENGTH: Record<DirectoryHeadingField, number> = { heading: 80, subheading: 250 };

/** The saved rows over the defaults. */
export function getDirectoryHeadingContent(db: Db): Promise<DirectoryHeadingContent> {
  return getSiteContent(db, KEY_PREFIX, DIRECTORY_HEADING_DEFAULTS);
}

/** A blank field deletes its row. Nothing is saved when any field is refused. */
export function saveDirectoryHeadingContent(
  db: Db,
  form: { get(name: string): unknown },
): Promise<SiteContentResult<DirectoryHeadingContent>> {
  return saveSiteContent(db, KEY_PREFIX, DIRECTORY_HEADING_DEFAULTS, form, (field: DirectoryHeadingField, value) =>
    value.length > MAX_LENGTH[field] ? `${LABELS[field]} can have at most ${MAX_LENGTH[field]} characters.` : null,
  );
}
