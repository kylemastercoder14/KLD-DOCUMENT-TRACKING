import { NextResponse } from "next/server";
import { getApprovedDocumentsForRepository } from "@/actions/document";

export async function GET() {
  try {
    const documents = await getApprovedDocumentsForRepository();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Failed to load repository documents:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load documents";
    const status =
      error instanceof Error && error.message === "Unauthorized"
        ? 401
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

