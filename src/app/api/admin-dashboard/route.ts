import { NextResponse } from "next/server";

import { getAdminDashboardAnalytics } from "@/actions/admin-dashboard";

export async function GET() {
  try {
    const data = await getAdminDashboardAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to load admin dashboard analytics:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard analytics";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

