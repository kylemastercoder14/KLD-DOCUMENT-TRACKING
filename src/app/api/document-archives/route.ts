import { NextResponse } from "next/server";
import { getArchivedDocumentsForUser } from "@/actions/document";

export async function GET() {
  try {
    const payload = await getArchivedDocumentsForUser();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load archived documents:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load archived documents";
    const status =
      error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

