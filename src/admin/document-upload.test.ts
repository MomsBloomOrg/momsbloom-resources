import { describe, expect, it } from "vitest";
import { MAX_PDF_SIZE, validatePdfUpload } from "./document-upload";

describe("validatePdfUpload", () => {
  it("accepts a PDF at the size limit", () => {
    expect(validatePdfUpload({ type: "application/pdf", size: MAX_PDF_SIZE })).toBeNull();
  });

  it("refuses a non-PDF", () => {
    expect(validatePdfUpload({ type: "image/png", size: 100 })).toBe("Choose a PDF file.");
  });

  it("refuses a PDF over 20 MB", () => {
    expect(validatePdfUpload({ type: "application/pdf", size: MAX_PDF_SIZE + 1 })).toBe("The PDF must be 20 MB or smaller.");
  });
});
