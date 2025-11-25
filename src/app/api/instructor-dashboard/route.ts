import { NextResponse } from "next/server";
import { getDashboardAnalytics } from "@/actions/document";

export async function GET() {
  try {
    const data = await getDashboardAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load dashboard analytics:", error);
    const message = error instanceof Error ? error.message : "Failed to load dashboard analytics";
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

