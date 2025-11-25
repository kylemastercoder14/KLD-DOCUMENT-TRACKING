import { headers } from "next/headers";

import prisma from "./prisma";
import { getServerSession } from "./session";

type LogStatus = "Success" | "Failed" | "Warning";

type LogInput = {
  action: string;
  status: LogStatus;
  details: string;
  userId?: string;
  ipAddress?: string | null;
};

export async function logSystemAction({
  action,
  status,
  details,
  userId,
  ipAddress,
}: LogInput) {
  try {
    const sessionUser = userId ? { id: userId } : await getServerSession();
    if (!sessionUser?.id) return;

    const forwardedFor = headers().get("x-forwarded-for");
    const resolvedIp =
      ipAddress ??
      forwardedFor?.split(",")[0]?.trim() ??
      headers().get("x-real-ip") ??
      "Unknown";

    await prisma.systemLog.create({
      data: {
        userId: sessionUser.id,
        action,
        status,
        details,
        ipAddress: resolvedIp,
      },
    });
  } catch (error) {
    console.error("System log error:", error);
  }
}

