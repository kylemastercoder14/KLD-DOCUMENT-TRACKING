"use server";

import prisma from "@/lib/prisma";
import { logSystemAction } from "@/lib/system-log";

type DocumentCategoryInput = {
  name: string;
  description?: string | null;
};

type DocumentCategoryPayload = {
  categories: DocumentCategoryInput[];
  designationIds?: string[];
};

const mapDesignationConnections = (ids?: string[]) =>
  (ids ?? []).filter(Boolean).map((id) => ({ id }));

export const getDocumentCategories = async () => {
  return prisma.documentCategory.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      designations: true,
    },
  });
};

export const createDocumentCategories = async (
  payload: DocumentCategoryPayload
) => {
  const { categories, designationIds } = payload;

  if (!categories?.length) {
    throw new Error("At least one document category is required");
  }

  const results = [];

  for (const category of categories) {
    const created = await prisma.documentCategory.create({
      data: {
        name: category.name,
        description: category.description,
        designations: {
          connect: mapDesignationConnections(designationIds),
        },
      },
      include: {
        designations: true,
      },
    });
    results.push(created);
  }

  await logSystemAction({
    action: "Create document categories",
    status: "Success",
    details: `Created ${results.length} document category(ies)`,
  });

  return results;
};

export const updateDocumentCategory = async (
  id: string,
  payload: DocumentCategoryPayload
) => {
  const category = payload.categories?.[0];

  if (!category) {
    throw new Error("Document category data is required");
  }

  const updated = await prisma.documentCategory.update({
    where: { id },
    data: {
      name: category.name,
      description: category.description,
      designations: {
        set: mapDesignationConnections(payload.designationIds),
      },
    },
    include: {
      designations: true,
    },
  });

  await logSystemAction({
    action: "Update document category",
    status: "Success",
    details: `Updated document category ${updated.name}`,
  });

  return updated;
};

export const archiveDocumentCategory = async (id: string) => {
  const category = await prisma.documentCategory.update({
    where: { id },
    data: {
      isActive: false,
    },
    include: {
      designations: true,
    },
  });

  await logSystemAction({
    action: "Archive document category",
    status: "Success",
    details: `Archived document category ${category.name}`,
  });

  return category;
};

export const restoreDocumentCategory = async (id: string) => {
  const category = await prisma.documentCategory.update({
    where: { id },
    data: {
      isActive: true,
    },
    include: {
      designations: true,
    },
  });

  await logSystemAction({
    action: "Restore document category",
    status: "Success",
    details: `Restored document category ${category.name}`,
  });

  return category;
};

export const bulkArchiveDocumentCategories = async (ids: string[]) => {
  if (!ids.length) {
    return { count: 0 };
  }

  const result = await prisma.documentCategory.updateMany({
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
      action: "Bulk archive document categories",
      status: "Success",
      details: `Archived ${result.count} document category(ies)`,
    });
  }

  return result;
};

export const uploadTemplate = async (id: string, templateUrl: string) => {
  const category = await prisma.documentCategory.update({
    where: { id },
    data: {
      attachment: templateUrl,
    },
    include: {
      designations: true,
    },
  });

  await logSystemAction({
    action: "Upload template",
    status: "Success",
    details: `Uploaded template for document category ${category.name}`,
  });

  return category;
};

export const removeTemplate = async (id: string) => {
  const category = await prisma.documentCategory.update({
    where: { id },
    data: {
      attachment: null,
    },
    include: {
      designations: true,
    },
  });

  await logSystemAction({
    action: "Remove template",
    status: "Success",
    details: `Removed template from document category ${category.name}`,
  });

  return category;
};

