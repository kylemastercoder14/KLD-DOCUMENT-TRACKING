import { NextRequest, NextResponse } from "next/server";

import { getAdminReportsAnalytics } from "@/actions/reports";

export async function GET(request: NextRequest) {
  try {
    const yearParam = request.nextUrl.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;
    const data = await getAdminReportsAnalytics(year);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load admin reports analytics:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load reports analytics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

