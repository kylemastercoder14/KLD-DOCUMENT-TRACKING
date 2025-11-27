"use server";

import AWS from "aws-sdk";
import { format } from "date-fns";
import path from "path";
import { Readable } from "stream";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { logSystemAction } from "@/lib/system-log";

const generateBackupId = (prefix = "BKP") =>
  `${prefix}-${format(new Date(), "yyyyMMddHHmmss")}`;

const ensureEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${key}" for backup operation.`
    );
  }
  return value;
};

const createS3Client = () => {
  const accessKeyId = ensureEnv("NEXT_PUBLIC_S3_ACCESS_KEY_ID");
  const secretAccessKey = ensureEnv("NEXT_PUBLIC_S3_SECRET_ACCESS_KEY");
  const region = ensureEnv("NEXT_PUBLIC_S3_REGION");

  return new AWS.S3({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

const uploadToS3 = async (key: string, body: Buffer | Readable) => {
  const bucket = ensureEnv("NEXT_PUBLIC_S3_BUCKET_NAME");
  const region = ensureEnv("NEXT_PUBLIC_S3_REGION");
  const s3 = createS3Client();

  await s3
    .upload({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/sql",
      ContentDisposition: `attachment; filename="${path.basename(key)}"`,
    })
    .promise();

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const requireSystemAdmin = async () => {
  const session = await getServerSession();
  if (!session || session.role !== "SYSTEM_ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
};

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

const createDummySqlStream = (sizeInBytes: number) => {
  const chunk = Buffer.from(
    "-- Dummy backup entry ------------------------------------------------------------\n"
  );
  let bytesGenerated = 0;

  return new Readable({
    read() {
      if (bytesGenerated >= sizeInBytes) {
        this.push(null);
        return;
      }

      const remaining = sizeInBytes - bytesGenerated;
      const chunkSize = Math.min(chunk.length, remaining);
      bytesGenerated += chunkSize;

      if (chunkSize === chunk.length) {
        this.push(chunk);
      } else {
        this.push(chunk.slice(0, chunkSize));
      }
    },
  });
};

export const startBackup = async () => {
  const session = await requireSystemAdmin();
  const backupId = generateBackupId();
  const sizeMb = Math.floor(Math.random() * 251) + 50; // 50 - 300 MB
  const sizeBytes = sizeMb * 1024 * 1024;
  const dummyStream = createDummySqlStream(sizeBytes);
  const fileKey = `backups/${backupId}.sql`;

  try {
    const fileUrl = await uploadToS3(fileKey, dummyStream);

    const backup = await prisma.backup.create({
      data: {
        backupId,
        type: "Manual",
        status: "Success",
        size: Number(sizeMb.toFixed(2)), // store in MB
        fileUrl,
        notes: "Simulated backup file generated.",
        createdById: session.id,
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
      userId: session.id,
      action: "Start backup",
      status: "Success",
      details: `Simulated backup created (${backupId})`,
    });

    return backup;
  } catch (error) {
    console.error("Backup simulation failed:", error);
    await logSystemAction({
      userId: session.id,
      action: "Start backup",
      status: "Failed",
      details: `Manual backup failed (${backupId}): ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
    throw new Error(error instanceof Error ? error.message : "Backup failed.");
  }
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

  const session = await requireSystemAdmin();
  const backupId = generateBackupId("RST");

  const record = await prisma.backup.create({
    data: {
      backupId,
      type: "Restore",
      status: "Success",
      size: Number(payload.size?.toFixed(2) ?? 0),
      fileUrl: payload.fileUrl,
      notes: `Simulated restore using ${payload.fileName}`,
      createdById: session.id,
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
    userId: session.id,
    action: "Restore backup",
    status: "Success",
    details: `Simulated restore using ${payload.fileName}`,
  });

  return record;
};
