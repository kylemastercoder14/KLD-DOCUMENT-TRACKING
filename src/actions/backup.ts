"use server";

import { format } from "date-fns";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { logSystemAction } from "@/lib/system-log";

const generateBackupId = (prefix = "BKP") =>
  `${prefix}-${format(new Date(), "yyyyMMddHHmmss")}`;

export const getBackups = async () => {
  return prisma.backup.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
};

export const startBackup = async () => {
  const session = await getServerSession();
  const backupId = generateBackupId();
  const size = Number((Math.random() * 0.5 + 1.0).toFixed(2)); // fake size 1-1.5 GB

  const backup = await prisma.backup.create({
    data: {
      backupId,
      type: "Manual",
      status: "Success",
      size,
      fileUrl: null,
      notes: "Manual backup triggered from dashboard.",
      createdById: session?.id,
    },
    include: {
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  await logSystemAction({
    userId: session?.id,
    action: "Start backup",
    status: "Success",
    details: `Manual backup initiated (${backupId})`,
  });

  return backup;
};

type RestorePayload = {
  fileUrl: string;
  fileName: string;
  size: number;
};

export const restoreFromBackup = async (payload: RestorePayload) => {
  if (!payload.fileUrl) {
    throw new Error("Backup file is required");
  }

  const session = await getServerSession();
  const backupId = generateBackupId("RST");

  const record = await prisma.backup.create({
    data: {
      backupId,
      type: "Restore",
      status: "Success",
      size: payload.size,
      fileUrl: payload.fileUrl,
      notes: `Restored using ${payload.fileName}`,
      createdById: session?.id,
    },
    include: {
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  await logSystemAction({
    userId: session?.id,
    action: "Restore backup",
    status: "Success",
    details: `Restore initiated using ${payload.fileName}`,
  });

  return record;
};

