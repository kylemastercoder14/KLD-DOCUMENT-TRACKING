"use server";

import { getServerSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { logSystemAction } from "@/lib/system-log";
import z from "zod";

export const getCurrentUser = async () => {
  const session = await getServerSession();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      designation: true,
      signature: true,
    },
  });

  return user;
};

const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
});

export async function updateProfile(data: {
  firstName: string;
  lastName: string;
  contactNumber: string;
}) {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const validated = updateProfileSchema.safeParse(data);
  if (!validated.success) {
    throw new Error(validated.error.issues.map((e) => e.message).join(", "));
  }

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: {
      firstName: validated.data.firstName,
      lastName: validated.data.lastName,
      contactNumber: validated.data.contactNumber,
    },
  });

  await logSystemAction({
    userId: session.id,
    action: "Update Profile",
    status: "Success",
    details: "User updated their profile information",
  });

  return {
    success: true,
    user: {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      contactNumber: updated.contactNumber,
      email: updated.email,
    },
  };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const validated = changePasswordSchema.safeParse(data);
  if (!validated.success) {
    throw new Error(validated.error.issues.map((e) => e.message).join(", "));
  }

  // Get current user to verify current password
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { password: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Verify current password
  if (user.password !== validated.data.currentPassword) {
    throw new Error("Current password is incorrect");
  }

  // Check if new password is different from current
  if (user.password === validated.data.newPassword) {
    throw new Error("New password must be different from current password");
  }

  // Update password
  await prisma.user.update({
    where: { id: session.id },
    data: {
      password: validated.data.newPassword,
    },
  });

  await logSystemAction({
    userId: session.id,
    action: "Change Password",
    status: "Success",
    details: "User changed their password",
  });

  return { success: true };
}

export async function updateProfileImage(imageUrl: string) {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: session.id },
    data: {
      image: imageUrl,
    },
  });

  await logSystemAction({
    userId: session.id,
    action: "Update Profile Image",
    status: "Success",
    details: "User updated their profile image",
  });

  return { success: true };
}
