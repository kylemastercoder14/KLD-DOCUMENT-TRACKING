import type { DocumentStatus, Role } from "@/generated/prisma";

export const canUserEditDocument = (
  user: { id: string; role: Role; designationId?: string | null } | null,
  document: { submittedById: string; status: DocumentStatus }
) => {
  if (!user) {
    return false;
  }

  const isOwner = document.submittedById === user.id;

  if (user.role === "INSTRUCTOR") {
    return isOwner;
  }

  if (["DEAN", "VPAA", "VPADA", "PRESIDENT"].includes(user.role)) {
    return document.status !== "APPROVED";
  }

  return false;
};

