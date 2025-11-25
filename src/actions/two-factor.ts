"use server";

import speakeasy from "speakeasy";
import QRCode from "qrcode";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import crypto from "crypto";

// Get encryption key
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "default-key-change-in-production";
  return crypto.createHash("sha256").update(keyString).digest();
}

// Encrypt data
function encrypt(data: string): string {
  const algorithm = "aes-256-gcm";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

// Decrypt data
function decrypt(encrypted: string): string {
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

/**
 * Generate a new 2FA secret and QR code
 */
export async function generateTwoFactorSecret() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `KLD Document Tracking (${session.email})`,
    issuer: "KLD Document Tracking System",
    length: 32,
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

  // Encrypt and store the secret temporarily (user needs to verify before enabling)
  const encryptedSecret = encrypt(secret.base32 || "");

  // Update user with the secret (but don't enable 2FA yet)
  await prisma.user.update({
    where: { id: session.id },
    data: {
      twoFactorSecret: encryptedSecret,
      // Don't enable yet - user must verify first
    },
  });

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
    manualEntryKey: secret.base32,
  };
}

/**
 * Verify TOTP token and enable 2FA
 */
export async function verifyAndEnableTwoFactor(token: string) {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { twoFactorSecret: true },
  });

  if (!user?.twoFactorSecret) {
    throw new Error("No 2FA secret found. Please generate a new one.");
  }

  // Decrypt the secret
  const decryptedSecret = decrypt(user.twoFactorSecret);

  // Verify the token
  const verified = speakeasy.totp.verify({
    secret: decryptedSecret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps (60 seconds) of tolerance
  });

  if (!verified) {
    throw new Error("Invalid verification code. Please try again.");
  }

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
  const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

  // Enable 2FA
  await prisma.user.update({
    where: { id: session.id },
    data: {
      twoFactorEnabled: true,
      backupCodes: encryptedBackupCodes,
    },
  });

  return {
    success: true,
    backupCodes, // Return plain backup codes for display (user should save these)
  };
}

/**
 * Verify TOTP token (for login)
 */
export async function verifyTwoFactorToken(token: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
    return false;
  }

  try {
    const decryptedSecret = decrypt(user.twoFactorSecret);
    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: "base32",
      token,
      window: 2,
    });

    return verified;
  } catch (error) {
    console.error("2FA verification error:", error);
    return false;
  }
}

/**
 * Verify backup code
 */
export async function verifyBackupCode(code: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { backupCodes: true, twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled || !user?.backupCodes) {
    return false;
  }

  try {
    const decryptedCodes = JSON.parse(decrypt(user.backupCodes)) as string[];
    const index = decryptedCodes.indexOf(code.toUpperCase());

    if (index === -1) {
      return false;
    }

    // Remove used backup code
    decryptedCodes.splice(index, 1);
    const encryptedCodes = encrypt(JSON.stringify(decryptedCodes));

    await prisma.user.update({
      where: { id: userId },
      data: { backupCodes: encryptedCodes },
    });

    return true;
  } catch (error) {
    console.error("Backup code verification error:", error);
    return false;
  }
}

/**
 * Disable 2FA
 */
export async function disableTwoFactor() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: session.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    },
  });

  return { success: true };
}

/**
 * Get 2FA status
 */
export async function getTwoFactorStatus() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });

  return {
    enabled: user?.twoFactorEnabled || false,
    hasSecret: !!user?.twoFactorSecret,
  };
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled) {
    throw new Error("2FA is not enabled");
  }

  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
  const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

  await prisma.user.update({
    where: { id: session.id },
    data: {
      backupCodes: encryptedBackupCodes,
    },
  });

  return {
    success: true,
    backupCodes,
  };
}

