import { updateTag } from "next/cache";

/**
 * Call after every Admin write that the Directory shows. The Directory reads a cached snapshot tagged
 * "directory" (ADR 0004). Its own file: a "use server" file may export only async functions.
 */
export function directoryChanged(): void {
  updateTag("directory");
}
