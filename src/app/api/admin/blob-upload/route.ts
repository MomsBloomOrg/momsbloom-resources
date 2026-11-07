import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { MAX_PDF_SIZE } from "@/admin/document-upload";
import { requireStaffAdmin } from "@/auth/dal";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        await requireStaffAdmin();

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_SIZE,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "The PDF upload was refused." },
      { status: 400 },
    );
  }
}
