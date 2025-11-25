"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { logSystemAction } from "@/lib/system-log";
import {
  DocumentHistoryAction,
  DocumentStatus,
  DocumentWorkflowStage,
} from "@/generated/prisma";

export const getDocumentComments = async (documentId: string) => {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      submittedBy: true,
      assignatories: { include: { user: true } },
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // Check if user has access (submitter or assignatory)
  const isSubmitter = document.submittedById === session.id;
  const isAssignatory = document.assignatories.some(
    (a) => a.userId === session.id
  );

  if (!isSubmitter && !isAssignatory) {
    throw new Error("Unauthorized: You don't have access to this document");
  }

  const comments = await prisma.documentComment.findMany({
    where: { documentId },
    include: {
      user: {
        include: {
          designation: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    user: {
      id: comment.user.id,
      name: `${comment.user.firstName} ${comment.user.lastName}`,
      email: comment.user.email,
      role: comment.user.role,
      designation: comment.user.designation?.name ?? null,
    },
  }));
};

export const createDocumentComment = async (
  documentId: string,
  content: string
) => {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  if (!content.trim()) {
    throw new Error("Comment content cannot be empty");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      submittedBy: true,
      assignatories: { include: { user: true } },
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // Check if user has access (submitter or assignatory)
  const isSubmitter = document.submittedById === session.id;
  const isAssignatory = document.assignatories.some(
    (a) => a.userId === session.id
  );

  if (!isSubmitter && !isAssignatory) {
    throw new Error("Unauthorized: You don't have access to this document");
  }

  const comment = await prisma.documentComment.create({
    data: {
      documentId,
      userId: session.id,
      content: content.trim(),
    },
    include: {
      user: {
        include: {
          designation: true,
        },
      },
    },
  });

  await logSystemAction({
    userId: session.id,
    action: "Add document comment",
    status: "Success",
    details: `Comment added to document ${document.referenceId}`,
  });

  // Log to document history
  const determineStageFromRole = (role: string): DocumentWorkflowStage => {
    switch (role) {
      case "DEAN":
        return "DEAN";
      case "VPAA":
        return "VPAA";
      case "VPADA":
        return "VPADA";
      case "PRESIDENT":
        return "PRESIDENT";
      default:
        return "INSTRUCTOR";
    }
  };

  await prisma.documentHistory.create({
    data: {
      documentId,
      action: DocumentHistoryAction.COMMENTED,
      status: document.status,
      stage: determineStageFromRole(session.role),
      summary: "Comment added",
      details: content.trim(),
      performedById: session.id,
    },
  });

  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    user: {
      id: comment.user.id,
      name: `${comment.user.firstName} ${comment.user.lastName}`,
      email: comment.user.email,
      role: comment.user.role,
      designation: comment.user.designation?.name ?? null,
    },
  };
};

