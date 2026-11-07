export const PHONE_ERROR = "Enter a US phone number, for example (616) 555-0100.";

const PHONE = /^(?:\+?1[ .-]?)?(?:\(([2-9][0-9]{2})\)|([2-9][0-9]{2}))[ .-]?([2-9][0-9]{2})[ .-]?([0-9]{4})(?:\s*(?:x|ext\.?|extension)\s*([0-9]+))?$/i;

/** A consistently formatted US number, or null when the text is blank or invalid. */
export function normalizePhone(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const match = PHONE.exec(value);
  if (!match) return null;
  const area = match[1] ?? match[2];
  const extension = match[5] ? ` x${match[5]}` : "";
  return `(${area}) ${match[3]}-${match[4]}${extension}`;
}

/** Writes the normalized optional phone, or its field error, into a parsed form. */
export function checkPhone(raw: unknown, errors: Record<string, string>, out: Record<string, unknown>): void {
  const text = typeof raw === "string" ? raw.trim() : "";
  const phone = normalizePhone(text);
  out.phone = phone;
  if (text && !phone) errors.phone = PHONE_ERROR;
}
