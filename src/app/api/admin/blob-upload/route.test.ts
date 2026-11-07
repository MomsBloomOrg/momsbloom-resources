import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PDF_SIZE } from "@/admin/document-upload";

const mocks = vi.hoisted(() => ({
  handleUpload: vi.fn(),
  requireStaffAdmin: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({ handleUpload: mocks.handleUpload }));
vi.mock("@/auth/dal", () => ({ requireStaffAdmin: mocks.requireStaffAdmin }));

import { POST } from "./route";

type BeforeToken = () => Promise<{
  allowedContentTypes?: string[];
  maximumSizeInBytes?: number;
  addRandomSuffix?: boolean;
}>;

const request = () =>
  new Request("http://localhost/api/admin/blob-upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: { pathname: "preview/documents/guide.pdf", multipart: false, clientPayload: null },
    }),
  });

describe("PDF Blob upload route", () => {
  beforeEach(() => {
    mocks.handleUpload.mockReset();
    mocks.requireStaffAdmin.mockReset();
    mocks.requireStaffAdmin.mockResolvedValue({ id: "a", email: "staff@example.org" });
    mocks.handleUpload.mockImplementation(async (options: { onBeforeGenerateToken: BeforeToken }) => {
      await options.onBeforeGenerateToken();
      return { type: "blob.generate-client-token", clientToken: "test-token" };
    });
  });

  it("checks the Staff admin before issuing a restricted token", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.requireStaffAdmin).toHaveBeenCalledOnce();
    const options = mocks.handleUpload.mock.calls[0]?.[0] as { onBeforeGenerateToken: BeforeToken };
    await expect(options.onBeforeGenerateToken()).resolves.toEqual({
      allowedContentTypes: ["application/pdf"],
      maximumSizeInBytes: MAX_PDF_SIZE,
      addRandomSuffix: true,
    });
  });

  it("refuses an upload without a login", async () => {
    mocks.requireStaffAdmin.mockRejectedValue(new Error("redirect:/login"));

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "The PDF upload was refused." });
  });
});
