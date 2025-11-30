import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ userId: session.id });
  } catch (error) {
    console.error("Error getting current user:", error);
    return NextResponse.json(
      { error: "Failed to get current user" },
      { status: 500 }
    );
  }
}

