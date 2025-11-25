import { NextResponse } from "next/server";
import { getVpaaDashboardAnalytics } from "@/actions/document";

export async function GET() {
  try {
    const payload = await getVpaaDashboardAnalytics();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to load VPAA dashboard analytics:", error);
    const message = error instanceof Error ? error.message : "Failed to load analytics";
    let status = 500;
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        status = 401;
      } else if (error.message === "Forbidden") {
        status = 403;
      }
    }
    return NextResponse.json({ error: message }, { status });
  }
}

