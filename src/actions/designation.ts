"use server";

import prisma from "@/lib/prisma";
import { logSystemAction } from "@/lib/system-log";

type DesignationPayload = {
  name: string;
  description?: string | null;
  documentCategoryIds?: string[];
};

const mapDocumentCategoryConnections = (ids?: string[]) =>
  (ids ?? []).filter(Boolean).map((id) => ({ id }));

export const getDesignations = async () => {
  return prisma.designation.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      documentCategories: true,
    },
  });
};

export const getDocumentCategories = async () => {
  return prisma.documentCategory.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
    },
  });
};

export const createDesignation = async (payload: DesignationPayload) => {
  const { name, description, documentCategoryIds } = payload;

  const designation = await prisma.designation.create({
    data: {
      name,
      description,
      documentCategories: {
        connect: mapDocumentCategoryConnections(documentCategoryIds),
      },
    },
    include: {
      documentCategories: true,
    },
  });

  await logSystemAction({
    action: "Create designation",
    status: "Success",
    details: `Created designation ${designation.name}`,
  });

  return designation;
};

export const updateDesignation = async (
  id: string,
  payload: DesignationPayload
) => {
  const { name, description, documentCategoryIds } = payload;

  const designation = await prisma.designation.update({
    where: { id },
    data: {
      name,
      description,
      documentCategories: {
        set: mapDocumentCategoryConnections(documentCategoryIds),
      },
    },
    include: {
      documentCategories: true,
    },
  });

  await logSystemAction({
    action: "Update designation",
    status: "Success",
    details: `Updated designation ${designation.name}`,
  });

  return designation;
};

export const archiveDesignation = async (id: string) => {
  const designation = await prisma.designation.update({
    where: { id },
    data: {
      isActive: false,
    },
    include: {
      documentCategories: true,
    },
  });

  await logSystemAction({
    action: "Archive designation",
    status: "Success",
    details: `Archived designation ${designation.name}`,
  });

  return designation;
};

export const restoreDesignation = async (id: string) => {
  const designation = await prisma.designation.update({
    where: { id },
    data: {
      isActive: true,
    },
    include: {
      documentCategories: true,
    },
  });

  await logSystemAction({
    action: "Restore designation",
    status: "Success",
    details: `Restored designation ${designation.name}`,
  });

  return designation;
};

export const bulkArchiveDesignations = async (ids: string[]) => {
  if (!ids.length) {
    return { count: 0 };
  }

  const result = await prisma.designation.updateMany({
    where: {
      id: {
        in: ids,
      },
    },
    data: {
      isActive: false,
    },
  });

  if (result.count > 0) {
    await logSystemAction({
      action: "Bulk archive designations",
      status: "Success",
      details: `Archived ${result.count} designation(s)`,
    });
  }

  return result;
};
