"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { logSystemAction } from "@/lib/system-log";
import z from "zod";
import crypto from "crypto";

const signatureSchema = z.object({
  imageData: z.string().min(1, "Signature image is required"),
  passcode: z
    .string()
    .length(6, "Passcode must be exactly 6 digits")
    .regex(/^\d+$/, "Passcode must contain only digits"),
});

// Get encryption key - use JWT_SECRET as fallback if ENCRYPTION_KEY is not set
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "default-key-change-in-production";
  // Ensure key is exactly 32 bytes for AES-256
  const keyHash = crypto.createHash("sha256").update(keyString).digest();
  return keyHash;
}

// Encrypt passcode using AES-256-GCM
function encryptPasscode(passcode: string): string {
  const algorithm = "aes-256-gcm";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(passcode, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return IV + AuthTag + Encrypted data (all hex encoded)
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

// Decrypt passcode
function decryptPasscode(encrypted: string): string {
  const algorithm = "aes-256-gcm";
  const key = getEncryptionKey();
  const parts = encrypted.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedData = parts[2];

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export async function getSignature() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const signature = await prisma.signature.findUnique({
    where: { userId: session.id },
    select: {
      id: true,
      imageData: true,
      createdAt: true,
      updatedAt: true,
      // Don't return passcode for security
    },
  });

  return signature;
}

export async function saveSignature(data: {
  imageData: string;
  passcode: string;
}) {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Validate input
  const validated = signatureSchema.safeParse(data);
  if (!validated.success) {
    throw new Error(
      validated.error.errors.map((e) => e.message).join(", ")
    );
  }

  const { imageData, passcode } = validated.data;

  // Encrypt the passcode
  const encryptedPasscode = encryptPasscode(passcode);

  // Upsert signature (create or update)
  const signature = await prisma.signature.upsert({
    where: { userId: session.id },
    create: {
      userId: session.id,
      imageData,
      passcode: encryptedPasscode,
    },
    update: {
      imageData,
      passcode: encryptedPasscode,
      updatedAt: new Date(),
    },
  });

  await logSystemAction({
    userId: session.id,
    action: signature.id ? "Update Signature" : "Create Signature",
    status: "Success",
    details: "User saved their e-signature",
  });

  return {
    id: signature.id,
    imageData: signature.imageData,
    createdAt: signature.createdAt,
    updatedAt: signature.updatedAt,
  };
}

export async function verifySignaturePasscode(passcode: string): Promise<boolean> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const signature = await prisma.signature.findUnique({
    where: { userId: session.id },
    select: { passcode: true },
  });

  if (!signature) {
    return false;
  }

  try {
    const decrypted = decryptPasscode(signature.passcode);
    return decrypted === passcode;
  } catch (error) {
    console.error("Passcode verification error:", error);
    return false;
  }
}

export async function deleteSignature() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.signature.deleteMany({
    where: { userId: session.id },
  });

  await logSystemAction({
    userId: session.id,
    action: "Delete Signature",
    status: "Success",
    details: "User deleted their e-signature",
  });

  return { success: true };
}

