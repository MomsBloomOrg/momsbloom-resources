export const MAX_PDF_SIZE = 20 * 1024 * 1024;

/** A message for a refused file, or null when it is ready to upload. */
export function validatePdfUpload(file: Pick<File, "size" | "type">): string | null {
  if (file.type !== "application/pdf") return "Choose a PDF file.";
  if (file.size > MAX_PDF_SIZE) return "The PDF must be 20 MB or smaller.";
  return null;
}
