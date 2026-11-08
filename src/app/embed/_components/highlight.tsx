import { highlightRanges } from "@/directory/search";

/** The text with the parts that the keyword words match in a `<mark>`. Plain React text, so it stays escaped. */
export function Highlight({ text, words }: { text: string; words: readonly string[] }) {
  const ranges = highlightRanges(text, words);
  if (!ranges.length) return text;
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) parts.push(text.slice(at, start));
    // forced-colors: the background is dropped there, so keep the default Mark system colors.
    parts.push(
      <mark key={start} className="rounded-sm bg-highlight text-inherit forced-colors:bg-[Mark] forced-colors:text-[MarkText]">
        {text.slice(start, end)}
      </mark>,
    );
    at = end;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
