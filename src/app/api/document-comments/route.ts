import { NextRequest, NextResponse } from "next/server";
import { getDocumentComments, createDocumentComment } from "@/actions/document-comment";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const comments = await getDocumentComments(documentId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching document comments:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch comments",
      },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, content } = body;

    if (!documentId || !content) {
      return NextResponse.json(
        { error: "Document ID and content are required" },
        { status: 400 }
      );
    }

    const comment = await createDocumentComment(documentId, content);
    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Error creating document comment:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create comment",
      },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

