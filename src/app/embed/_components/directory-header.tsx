import { DIRECTORY_HEADING_DEFAULTS, type DirectoryHeadingContent } from "@/admin/directory-heading";

/**
 * Title and intro. Shared by the page and the error screen so the header does not jump. The error screen
 * passes nothing, so it shows the defaults (it must not read the database after a failed load).
 */
export function DirectoryHeader({ heading, subheading }: Partial<DirectoryHeadingContent> = {}) {
  return (
    <header className="text-left md:text-center">
      <h1 className="text-3xl font-medium md:text-5xl">{heading ?? DIRECTORY_HEADING_DEFAULTS.heading}</h1>
      <p className="mt-2 max-w-3xl text-muted md:mx-auto">
        {subheading ?? DIRECTORY_HEADING_DEFAULTS.subheading}{" "}
        {/* Fixed link to the help box (#help). The browser handles the jump. */}
        <a href="#help" className="underline">
          Need more assistance
        </a>
        ?
      </p>
    </header>
  );
}
