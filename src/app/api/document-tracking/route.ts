import { NextRequest, NextResponse } from "next/server";
import { getDocumentTrackingByReference } from "@/actions/document";

export async function GET(request: NextRequest) {
  const referenceId = request.nextUrl.searchParams.get("referenceId");

  if (!referenceId) {
    return NextResponse.json(
      { error: "referenceId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const payload = await getDocumentTrackingByReference(referenceId.trim());
    if (!payload) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch tracking data:", error);
    return NextResponse.json(
      { error: "Failed to fetch document tracking data" },
      { status: 500 }
    );
  }
}

