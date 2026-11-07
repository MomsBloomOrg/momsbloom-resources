/**
 * Keyword search (docs/specs/public-directory.md, "Search").
 *
 * - Not case-sensitive, ignores accents and extra spaces.
 * - Matches part of a word: "lact" finds "Lactation".
 * - Every word the family types must appear somewhere: "yoga spanish" finds Programs that mention
 *   both, not either.
 */
import type { DirectoryDocument, DirectoryProgram, FacetValueKeys } from "./types";

/** Lower case, no accents ("é" → "e"), single spaces. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** The words of a keyword, ready to match. An empty keyword gives []. */
export function keywordWords(keyword: string): string[] {
  const normalized = normalizeText(keyword);
  return normalized ? normalized.split(" ") : [];
}

/** True when every word appears in the text. No words always matches. */
export function matchesWords(normalizedText: string, words: readonly string[]): boolean {
  return words.every((word) => normalizedText.includes(word));
}

/** Finds the label of a Facet value key, so "yoga" matches the Subcategory labeled "Yoga". */
export type LabelLookup = (key: string) => string | undefined;

function categoryLabels(values: FacetValueKeys, labelOf: LabelLookup): string[] {
  return [...values.category, ...values.subcategory].map((key) => labelOf(key) ?? "");
}

/** All the searchable text of a Program, as one normalized string. */
export function programSearchText(program: DirectoryProgram, labelOf: LabelLookup): string {
  return normalizeText(
    [
      program.name,
      program.organization.name,
      program.description,
      program.searchKeywords,
      ...categoryLabels(program.facetValues, labelOf),
      ...program.contacts.flatMap((contact) => [contact.name, contact.title ?? ""]),
    ].join(" "),
  );
}

/** All the searchable text of a Document, as one normalized string. */
export function documentSearchText(document: DirectoryDocument, labelOf: LabelLookup): string {
  return normalizeText(
    [document.title, document.description, document.searchKeywords, ...categoryLabels(document.facetValues, labelOf)].join(
      " ",
    ),
  );
}
