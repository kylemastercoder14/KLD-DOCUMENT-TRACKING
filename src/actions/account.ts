"use server";

import prisma from "@/lib/prisma";
import { logSystemAction } from "@/lib/system-log";
import { Role } from "@/generated/prisma/enums";

type AccountPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password?: string | null;
  role: Role;
  contactNumber: string;
  image?: string | null;
  designationId: string;
};

export const getAccounts = async () => {
  return prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      designation: true,
    },
  });
};

export const createAccount = async (payload: AccountPayload) => {
  if (!payload.password) {
    throw new Error("Password is required");
  }

  const account = await prisma.user.create({
    data: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      contactNumber: payload.contactNumber,
      image: payload.image,
      designation: {
        connect: { id: payload.designationId },
      },
    },
    include: {
      designation: true,
    },
  });

  await logSystemAction({
    action: "Create account",
    status: "Success",
    details: `Created account for ${account.email}`,
  });

  return account;
};

export const updateAccount = async (id: string, payload: AccountPayload) => {
  const data: Record<string, unknown> = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    role: payload.role,
    contactNumber: payload.contactNumber,
    image: payload.image,
    designation: {
      connect: { id: payload.designationId },
    },
  };

  if (payload.password) {
    data.password = payload.password;
  }

  const account = await prisma.user.update({
    where: { id },
    data,
    include: {
      designation: true,
    },
  });

  await logSystemAction({
    action: "Update account",
    status: "Success",
    details: `Updated account for ${account.email}`,
  });

  return account;
};

export const archiveAccount = async (id: string) => {
  const account = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    include: { designation: true },
  });

  await logSystemAction({
    action: "Archive account",
    status: "Success",
    details: `Archived account for ${account.email}`,
  });

  return account;
};

export const restoreAccount = async (id: string) => {
  const account = await prisma.user.update({
    where: { id },
    data: { isActive: true },
    include: { designation: true },
  });

  await logSystemAction({
    action: "Restore account",
    status: "Success",
    details: `Restored account for ${account.email}`,
  });

  return account;
};

export const bulkArchiveAccounts = async (ids: string[]) => {
  if (!ids.length) {
    return { count: 0 };
  }

  const result = await prisma.user.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: { isActive: false },
  });

  if (result.count > 0) {
    await logSystemAction({
      action: "Bulk archive accounts",
      status: "Success",
      details: `Archived ${result.count} account(s)`,
    });
  }

  return result;
};

