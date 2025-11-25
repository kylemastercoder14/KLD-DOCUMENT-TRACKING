import { NextResponse } from "next/server";
import {
  getDocumentHistoryEntries,
  getDocumentTrackingByReference,
} from "@/actions/document";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  const referenceId = searchParams.get("referenceId");

  if (!documentId && !referenceId) {
    return NextResponse.json(
      { error: "documentId or referenceId is required" },
      { status: 400 }
    );
  }

  try {
    if (documentId) {
      const history = await getDocumentHistoryEntries(documentId);
      return NextResponse.json({ history });
    }

    if (referenceId) {
      const tracking = await getDocumentTrackingByReference(referenceId);
      if (!tracking) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      return NextResponse.json(tracking);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Failed to fetch document history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

