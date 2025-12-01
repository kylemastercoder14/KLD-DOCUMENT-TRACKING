/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import prisma from "@/lib/prisma";
import { logSystemAction } from "@/lib/system-log";
import { getServerSession } from "@/lib/session";
import { deleteFromS3 } from "@/lib/upload";
import {
  DocumentHistoryAction,
  DocumentStatus,
  DocumentWorkflowStage,
  Role,
  DocumentRejectionReason,
} from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  DOCUMENT_HISTORY_ACTION_LABELS,
  DOCUMENT_REJECTION_REASON_LABELS,
  WORKFLOW_STAGE_LABELS,
} from "@/constants/document-history";
import { format, startOfMonth, subMonths } from "date-fns";
import {
  createNotification,
  createNotificationsForUsers,
} from "@/actions/notification";

type DocumentPayload = {
  attachment: string;
  fileCategoryId: string;
  remarks?: string | null;
  fileDate: Date;
  priority: "Low" | "Medium" | "High";
  assignatories: string[];
};

const PRISMA_PRIORITY_MAP: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
};

const PRIORITY_DISPLAY_MAP: Record<
  "LOW" | "MEDIUM" | "HIGH",
  "Low" | "Medium" | "High"
> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const STATUS_DISPLAY_MAP: Record<
  "PENDING" | "APPROVED" | "REJECTED",
  "Pending" | "Approved" | "Rejected"
> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

type TimelineEntry = {
  id: string;
  action: string;
  description: string;
  location: string;
  status: "Pending" | "Approved" | "Rejected";
  timestamp: string;
  isActive: boolean;
  performedBy?: string | null;
  rejectionReason?: string | null;
  rejectionDetails?: string | null;
};

const determineStageFromRole = (role?: Role | null): DocumentWorkflowStage => {
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

const mapHistoryEntries = (
  history: Prisma.DocumentHistoryGetPayload<{
    include: { performedBy: true };
  }>[]
): TimelineEntry[] => {
  const sorted = [...history].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  return sorted.map((entry, index) => ({
    id: entry.id,
    action:
      DOCUMENT_HISTORY_ACTION_LABELS[entry.action] ??
      entry.action.replace(/_/g, " "),
    description: entry.details || entry.summary,
    location: WORKFLOW_STAGE_LABELS[entry.stage] ?? "In Transit",
    status: STATUS_DISPLAY_MAP[entry.status] ?? "Pending",
    timestamp: entry.createdAt.toISOString(),
    isActive: index === 0,
    performedBy: entry.performedBy
      ? `${entry.performedBy.firstName} ${entry.performedBy.lastName}`
      : null,
    rejectionReason: entry.rejectionReason
      ? DOCUMENT_REJECTION_REASON_LABELS[entry.rejectionReason] ??
        entry.rejectionReason
      : null,
    rejectionDetails: entry.rejectionDetails ?? null,
  }));
};

type HistoryLogParams = {
  documentId: string;
  action: DocumentHistoryAction;
  status: DocumentStatus;
  stage?: DocumentWorkflowStage;
  summary: string;
  details?: string | null;
  rejectionReason?: DocumentRejectionReason | null;
  rejectionDetails?: string | null;
  performedById?: string | null;
  metadata?: Prisma.InputJsonValue;
};

const logDocumentHistoryEntry = async ({
  documentId,
  action,
  status,
  stage,
  summary,
  details,
  rejectionReason,
  rejectionDetails,
  performedById,
  metadata,
}: HistoryLogParams) => {
  await prisma.documentHistory.create({
    data: {
      documentId,
      action,
      status,
      stage: stage ?? "INSTRUCTOR",
      summary,
      details,
      rejectionReason: rejectionReason ?? null,
      rejectionDetails: rejectionDetails ?? null,
      performedById: performedById ?? null,
      metadata: metadata ?? undefined,
    },
  });
};

const generateReferenceId = async (fileCategoryId: string) => {
  const prefix = fileCategoryId.substring(0, 3).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DOC-${prefix}-${randomPart}`;
};

export const getDocuments = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true, designationId: true },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  // VPAA, VPADA, and President can see all documents
  const isPrivilegedRole = ["VPAA", "VPADA", "PRESIDENT"].includes(currentUser.role);

  // Dean and HR can see their own documents OR documents forwarded to them
  const canSeeForwarded = ["DEAN", "HR"].includes(currentUser.role);

  // Build where clause based on user role
  const where: Prisma.DocumentWhereInput = isPrivilegedRole
    ? {
        // For privileged roles, show all documents (all statuses)
        // No filtering needed - show everything
      }
    : canSeeForwarded
    ? {
        // For Dean and HR: user's own documents OR documents forwarded to them, show all statuses
        OR: [
          { submittedById: currentUser.id },
          {
            assignatories: {
              some: {
                userId: currentUser.id,
              },
            },
          },
        ],
      }
    : {
        // For Instructor: ONLY their own documents, show all statuses
        submittedById: currentUser.id,
      };

  const docs = await prisma.document.findMany({
    where,
    include: {
      fileCategory: true,
      submittedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      history: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { stage: true, action: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return docs.map((doc) => {
    const latestHistory = doc.history[0];
    const currentStage = latestHistory?.stage ?? "INSTRUCTOR";
    const isForwarded = latestHistory?.action === "FORWARDED";

    return {
      id: doc.id,
      referenceId: doc.referenceId,
      attachment: doc.attachment,
      attachmentName: doc.attachment.split("/").pop() || doc.referenceId,
      category: doc.fileCategory.name,
      categoryId: doc.fileCategoryId,
      priority: PRIORITY_DISPLAY_MAP[doc.priority],
      status: STATUS_DISPLAY_MAP[doc.status],
      workflowStage: currentStage,
      isForwarded,
      submittedBy: doc.submittedBy
        ? `${doc.submittedBy.firstName} ${doc.submittedBy.lastName}`
        : "Unknown",
      submittedById: doc.submittedById,
      createdAt: doc.createdAt.toISOString(),
    };
  });
};

export const getDocumentById = async (id: string) => {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      fileCategory: true,
      submittedBy: {
        include: {
          designation: true,
        },
      },
      assignatories: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!doc) {
    return null;
  }

  return {
    id: doc.id,
    referenceId: doc.referenceId,
    attachment: doc.attachment,
    attachmentName: doc.attachment.split("/").pop() || doc.referenceId,
    categoryId: doc.fileCategoryId,
    category: doc.fileCategory.name,
    priority: PRIORITY_DISPLAY_MAP[doc.priority],
    status: STATUS_DISPLAY_MAP[doc.status],
    fileDate: doc.fileDate.toISOString(),
    remarks: doc.remarks,
    submittedBy: {
      id: doc.submittedBy.id,
      name: `${doc.submittedBy.firstName} ${doc.submittedBy.lastName}`,
    },
    assignatories: doc.assignatories.map((assignatory) => ({
      id: assignatory.userId,
      name: `${assignatory.user.firstName} ${assignatory.user.lastName}`,
    })),
    createdAt: doc.createdAt.toISOString(),
  };
};

export const createDocument = async (payload: DocumentPayload) => {
  const session = await getServerSession();
  const userId = session?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const referenceId = await generateReferenceId(payload.fileCategoryId);

  const document = await prisma.document.create({
    data: {
      referenceId,
      attachment: payload.attachment,
      remarks: payload.remarks,
      fileDate: payload.fileDate,
      priority: PRISMA_PRIORITY_MAP[payload.priority] ?? "MEDIUM",
      submittedById: userId,
      fileCategoryId: payload.fileCategoryId,
      assignatories: {
        create: (payload.assignatories ?? []).map((assignatoryId) => ({
          user: {
            connect: { id: assignatoryId },
          },
        })),
      },
    },
    include: {
      fileCategory: true,
    },
  });

  await logSystemAction({
    userId,
    action: "Submit document",
    status: "Success",
    details: `Document submitted with reference ID ${referenceId}`,
  });

  await logDocumentHistoryEntry({
    documentId: document.id,
    action: DocumentHistoryAction.SUBMITTED,
    status: DocumentStatus.PENDING,
    stage: determineStageFromRole(session?.role),
    summary: "Document created & submitted",
    details: payload.remarks ?? null,
    performedById: userId,
  });

  // Get submitter info for notification
  const submitter = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, designationId: true },
  });

  // Find dean with same designation
  const dean = await prisma.user.findFirst({
    where: {
      role: "DEAN",
      designationId: submitter?.designationId ?? undefined,
      isActive: true,
    },
    select: { id: true },
  });

  const notificationUserIds: string[] = [];
  if (dean) {
    notificationUserIds.push(dean.id);
  }
  // Add assignatories if any
  if (payload.assignatories?.length) {
    notificationUserIds.push(...payload.assignatories);
  }

  // Send notifications
  if (notificationUserIds.length > 0) {
    await createNotificationsForUsers(notificationUserIds, {
      title: "New Document Submitted",
      description: `Document ${referenceId} has been submitted${
        submitter ? ` by ${submitter.firstName} ${submitter.lastName}` : ""
      } and requires your review.`,
      type: "DOCUMENT_SUBMITTED",
      link: `/dean/designate-document/view/${document.id}`,
      metadata: {
        documentId: document.id,
        referenceId,
        submittedById: userId,
      },
    });
  }

  return {
    id: document.id,
    referenceId: document.referenceId,
    attachment: document.attachment,
    attachmentName:
      document.attachment.split("/").pop() || document.referenceId,
    categoryId: document.fileCategoryId,
    category: document.fileCategory.name,
    priority: PRIORITY_DISPLAY_MAP[document.priority],
    status: STATUS_DISPLAY_MAP[document.status],
    createdAt: document.createdAt.toISOString(),
  };
};

export const replaceDocumentAttachment = async (
  documentId: string,
  newAttachmentUrl: string
) => {
  const session = await getServerSession();
  const userId = session?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!documentId || typeof documentId !== "string" || documentId.trim() === "") {
    throw new Error("Invalid document ID");
  }

  try {
    const existingDocument = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        attachment: true,
        referenceId: true,
        status: true,
        submittedById: true,
      },
    });

    if (!existingDocument) {
      console.error(`[replaceDocumentAttachment] Document not found:`, {
        documentId,
        userId,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Document not found. The document may have been deleted or you may not have permission to access it.`);
    }

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user has permission to replace attachment
    // Allow: owner, assignatories, or privileged roles (VPAA, VPADA, PRESIDENT)
    const isOwner = existingDocument.submittedById === currentUser.id;
    const isPrivilegedRole = ["VPAA", "VPADA", "PRESIDENT"].includes(currentUser.role);

    // Check if user is an assignatory
    const isAssignatory = await prisma.documentAssignatory.findFirst({
      where: {
        documentId: documentId,
        userId: currentUser.id,
      },
    });

    if (!isOwner && !isPrivilegedRole && !isAssignatory) {
      throw new Error("You are not allowed to replace this document's attachment. Only the document owner, assignatories, or privileged roles can do this.");
    }

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        attachment: newAttachmentUrl,
      },
    });

    await logSystemAction({
      userId,
      action: "Replace document attachment",
      status: "Success",
      details: `Document ${existingDocument.referenceId} attachment replaced with signed PDF`,
    });

    await logDocumentHistoryEntry({
      documentId,
      action: DocumentHistoryAction.SIGNATURE_ATTACHED,
      status: existingDocument.status,
      stage: determineStageFromRole(session?.role),
      summary: "Signed PDF uploaded",
      performedById: userId,
    });

    if (
      existingDocument.attachment &&
      existingDocument.attachment !== newAttachmentUrl
    ) {
      await deleteFromS3(existingDocument.attachment).catch((error) => {
        console.error("Failed to delete previous attachment from S3", error);
      });
    }

    return {
      id: updatedDocument.id,
      attachment: updatedDocument.attachment,
      attachmentName:
        updatedDocument.attachment.split("/").pop() ||
        existingDocument.referenceId,
    };
  } catch (error) {
    // Re-throw the error with more context if it's our custom error
    if (error instanceof Error) {
      throw error;
    }
    // Handle unexpected errors
    console.error("[replaceDocumentAttachment] Unexpected error:", error);
    throw new Error("Failed to replace document attachment");
  }
};

export const deleteDocumentById = async (documentId: string) => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      referenceId: true,
      attachment: true,
      submittedById: true,
      status: true,
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // Only the owner can delete their own document
  const isOwner = document.submittedById === currentUser.id;

  if (!isOwner) {
    throw new Error("You are not allowed to delete this document. Only the document owner can delete it.");
  }

  if (document.status === "APPROVED") {
    throw new Error("Approved documents cannot be deleted.");
  }

  await prisma.document.delete({
    where: { id: documentId },
  });

  if (document.attachment) {
    await deleteFromS3(document.attachment).catch((err) => {
      console.error("Failed to delete attachment from S3", err);
    });
  }

  await logSystemAction({
    userId: currentUser.id,
    action: "Delete document",
    status: "Success",
    details: `Document ${document.referenceId} deleted`,
  });

  return { id: document.id };
};

export const approveDocumentById = async (
  documentId: string,
  remarks?: string | null
) => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      submittedBy: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.status === "APPROVED") {
    throw new Error("Document is already approved.");
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "APPROVED",
      remarks: remarks ?? undefined,
    },
  });

  await logDocumentHistoryEntry({
    documentId,
    action: DocumentHistoryAction.APPROVED,
    status: DocumentStatus.APPROVED,
    stage: determineStageFromRole(session.role),
    summary: "Document approved",
    details: remarks ?? undefined,
    performedById: session.id,
  });

  await logSystemAction({
    userId: session.id,
    action: "Approve document",
    status: "Success",
    details: `Document ${document.referenceId} approved`,
  });

  // Notify the submitter
  if (document.submittedById && document.submittedById !== session.id) {
    await createNotification({
      title: "Document Approved",
      description: `Your document ${document.referenceId} has been approved${
        remarks ? `. Remarks: ${remarks}` : "."
      }`,
      type: "DOCUMENT_APPROVED",
      userId: document.submittedById,
      link: `/instructor/designate-document/view/${documentId}`,
      metadata: {
        documentId,
        referenceId: document.referenceId,
        approvedById: session.id,
      },
    });
  }

  return { id: updated.id };
};

export const rejectDocumentById = async (
  documentId: string,
  params: { reason: DocumentRejectionReason; details?: string | null }
) => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      submittedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.status === "REJECTED") {
    throw new Error("Document is already rejected.");
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      status: "REJECTED",
      remarks: params.details ?? undefined,
    },
  });

  await logDocumentHistoryEntry({
    documentId,
    action: DocumentHistoryAction.REJECTED,
    status: DocumentStatus.REJECTED,
    stage: determineStageFromRole(session.role),
    summary: "Document rejected",
    details: params.details ?? undefined,
    rejectionReason: params.reason,
    rejectionDetails: params.details ?? undefined,
    performedById: session.id,
  });

  await logSystemAction({
    userId: session.id,
    action: "Reject document",
    status: "Success",
    details: `Document ${document.referenceId} rejected`,
  });

  // Notify the submitter
  if (document.submittedById && document.submittedById !== session.id) {
    const reasonLabel =
      DOCUMENT_REJECTION_REASON_LABELS[params.reason] ?? params.reason;
    await createNotification({
      title: "Document Rejected",
      description: `Your document ${
        document.referenceId
      } has been rejected. Reason: ${reasonLabel}${
        params.details ? `. Details: ${params.details}` : "."
      }`,
      type: "DOCUMENT_REJECTED",
      userId: document.submittedById,
      link: `/instructor/designate-document/view/${documentId}`,
      metadata: {
        documentId,
        referenceId: document.referenceId,
        rejectionReason: params.reason,
        rejectedById: session.id,
      },
    });
  }

  return { id: updated.id };
};

export const getForwardableRecipientsForDean = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const dean = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });

  if (!dean || dean.role !== "DEAN") {
    throw new Error("Forbidden");
  }

  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ role: "VPAA" }, { role: "VPADA" }, { role: "HR" }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      designation: {
        select: { name: true },
      },
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  });

  return recipients.map((recipient) => ({
    id: recipient.id,
    name: `${recipient.firstName} ${recipient.lastName}`,
    role: recipient.role,
    designation: recipient.designation?.name ?? null,
  }));
};

export const getForwardableRecipientsForVpaa = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const vpaa = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true },
  });

  if (!vpaa || (vpaa.role !== "VPAA" && vpaa.role !== "VPADA")) {
    throw new Error("Forbidden");
  }

  // Only return President as recipient
  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      role: "PRESIDENT",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      designation: {
        select: { name: true },
      },
    },
    orderBy: { firstName: "asc" },
  });

  return recipients.map((recipient) => ({
    id: recipient.id,
    name: `${recipient.firstName} ${recipient.lastName}`,
    role: recipient.role,
    designation: recipient.designation?.name ?? null,
  }));
};

export const forwardDocumentById = async (
  documentId: string,
  payload: { targetUserIds: string[]; note?: string | null }
) => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const dean = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true },
  });

  if (!dean || dean.role !== "DEAN") {
    throw new Error("Forbidden");
  }

  if (!payload.targetUserIds?.length) {
    throw new Error("Select at least one recipient");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, referenceId: true },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  const recipients = await prisma.user.findMany({
    where: {
      id: { in: payload.targetUserIds },
      isActive: true,
      OR: [{ role: "VPAA" }, { role: "VPADA" }, { role: "HR" }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  if (!recipients.length) {
    throw new Error("No valid recipients selected");
  }

  await prisma.documentAssignatory.createMany({
    data: recipients.map((recipient) => ({
      documentId,
      userId: recipient.id,
    })),
    skipDuplicates: true,
  });

  const recipientNames = recipients
    .map((recipient) => `${recipient.firstName} ${recipient.lastName}`)
    .join(", ");

  await logDocumentHistoryEntry({
    documentId,
    action: DocumentHistoryAction.FORWARDED,
    status: DocumentStatus.PENDING,
    stage: determineStageFromRole(dean.role),
    summary: `Forwarded to ${recipientNames}`,
    details: payload.note ?? undefined,
    performedById: dean.id,
  });

  await logSystemAction({
    userId: dean.id,
    action: "Forward document",
    status: "Success",
    details: `Document ${document.referenceId} forwarded to ${recipientNames}`,
  });

  // Notify recipients
  const recipientIds = recipients.map((r) => r.id);
  if (recipientIds.length > 0) {
    const deanUser = await prisma.user.findUnique({
      where: { id: dean.id },
      select: { firstName: true, lastName: true },
    });
    const deanName = deanUser
      ? `${deanUser.firstName} ${deanUser.lastName}`
      : "Dean";

    await createNotificationsForUsers(recipientIds, {
      title: "Document Forwarded to You",
      description: `Document ${
        document.referenceId
      } has been forwarded to you by ${deanName}${
        payload.note ? `. Note: ${payload.note}` : "."
      }`,
      type: "DOCUMENT_ASSIGNED",
      link: `/dean/designate-document/view/${documentId}`,
      metadata: {
        documentId,
        referenceId: document.referenceId,
        forwardedById: dean.id,
        note: payload.note,
      },
    });
  }

  // Also notify the submitter that their document was forwarded
  const documentWithSubmitter = await prisma.document.findUnique({
    where: { id: documentId },
    select: { submittedById: true },
  });

  if (
    documentWithSubmitter?.submittedById &&
    documentWithSubmitter.submittedById !== dean.id
  ) {
    await createNotification({
      title: "Document Forwarded",
      description: `Your document ${document.referenceId} has been forwarded to ${recipientNames} for further review.`,
      type: "DOCUMENT_UPDATED",
      userId: documentWithSubmitter.submittedById,
      link: `/instructor/designate-document/view/${documentId}`,
      metadata: {
        documentId,
        referenceId: document.referenceId,
        forwardedTo: recipientIds,
      },
    });
  }

  return {
    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      name: `${recipient.firstName} ${recipient.lastName}`,
      role: recipient.role,
    })),
  };
};

export const forwardDocumentByIdForVpaa = async (
  documentId: string,
  payload: { targetUserIds: string[]; note?: string | null }
) => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const vpaa = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true },
  });

  if (!vpaa || (vpaa.role !== "VPAA" && vpaa.role !== "VPADA")) {
    throw new Error("Forbidden");
  }

  if (!payload.targetUserIds?.length) {
    throw new Error("Select at least one recipient");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, referenceId: true },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  // Only allow forwarding to President
  const recipients = await prisma.user.findMany({
    where: {
      id: { in: payload.targetUserIds },
      isActive: true,
      role: "PRESIDENT",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  if (!recipients.length) {
    throw new Error(
      "No valid recipients selected. Only President can be selected."
    );
  }

  await prisma.documentAssignatory.createMany({
    data: recipients.map((recipient) => ({
      documentId,
      userId: recipient.id,
    })),
    skipDuplicates: true,
  });

  const recipientNames = recipients
    .map((recipient) => `${recipient.firstName} ${recipient.lastName}`)
    .join(", ");

  await logDocumentHistoryEntry({
    documentId,
    action: DocumentHistoryAction.FORWARDED,
    status: DocumentStatus.PENDING,
    stage: determineStageFromRole(vpaa.role),
    summary: `Forwarded to ${recipientNames}`,
    details: payload.note ?? undefined,
    performedById: vpaa.id,
  });

  await logSystemAction({
    userId: vpaa.id,
    action: "Forward document",
    status: "Success",
    details: `Document ${document.referenceId} forwarded to ${recipientNames}`,
  });

  // Notify recipients
  const recipientIds = recipients.map((r) => r.id);
  if (recipientIds.length > 0) {
    const vpaaUser = await prisma.user.findUnique({
      where: { id: vpaa.id },
      select: { firstName: true, lastName: true },
    });
    const vpaaName = vpaaUser
      ? `${vpaaUser.firstName} ${vpaaUser.lastName}`
      : vpaa.role;

    await createNotificationsForUsers(recipientIds, {
      title: "Document Forwarded to You",
      description: `Document ${
        document.referenceId
      } has been forwarded to you by ${vpaaName}${
        payload.note ? `. Note: ${payload.note}` : "."
      }`,
      type: "DOCUMENT_ASSIGNED",
      link: `/dean/designate-document/view/${documentId}`,
      metadata: {
        documentId,
        referenceId: document.referenceId,
        forwardedById: vpaa.id,
        note: payload.note,
      },
    });
  }

  // Also notify the submitter that their document was forwarded
  const documentWithSubmitter = await prisma.document.findUnique({
    where: { id: documentId },
    select: { submittedById: true },
  });

  if (
    documentWithSubmitter?.submittedById &&
    documentWithSubmitter.submittedById !== vpaa.id
  ) {
    await createNotification({
      title: "Document Forwarded",
      description: `Your document ${document.referenceId} has been forwarded to ${recipientNames} for further review.`,
      type: "DOCUMENT_UPDATED",
      userId: documentWithSubmitter.submittedById,
      link: `/instructor/designate-document/view/${documentId}`,
      metadata: {
        documentId,
        referenceId: document.referenceId,
        forwardedTo: recipientIds,
      },
    });
  }

  return {
    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      name: `${recipient.firstName} ${recipient.lastName}`,
      role: recipient.role,
    })),
  };
};

export const getDocumentHistoryEntries = async (documentId: string) => {
  const history = await prisma.documentHistory.findMany({
    where: { documentId },
    include: { performedBy: true },
  });

  return mapHistoryEntries(history);
};

export const getDocumentTrackingByReference = async (referenceId: string) => {
  const document = await prisma.document.findUnique({
    where: { referenceId },
    include: {
      fileCategory: true,
      submittedBy: {
        include: { designation: true },
      },
      history: {
        include: { performedBy: true },
      },
    },
  });

  if (!document) {
    return null;
  }

  const history = mapHistoryEntries(document.history);

  return {
    document: {
      id: document.id,
      referenceId: document.referenceId,
      title: document.fileCategory.name,
      category: document.fileCategory.name,
      status: STATUS_DISPLAY_MAP[document.status],
      priority: PRIORITY_DISPLAY_MAP[document.priority],
      submittedBy: `${document.submittedBy.firstName} ${document.submittedBy.lastName}`,
      submittedDate: document.createdAt.toISOString(),
      currentLocation: history[0]?.location ?? WORKFLOW_STAGE_LABELS.INSTRUCTOR,
      department: document.submittedBy.designation?.name ?? "Unassigned",
      attachments: document.attachment ? [document.attachment] : [],
    },
    history,
  };
};

export const getApprovedDocumentsForRepository = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
    include: {
      designation: true,
    },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  // Get all approved documents first
  const allApprovedDocs = await prisma.document.findMany({
    where: {
      status: "APPROVED",
    },
    include: {
      fileCategory: {
        include: {
          designations: true,
        },
      },
      submittedBy: {
        include: {
          designation: true,
        },
      },
      assignatories: {
        include: {
          user: true,
        },
      },
      history: {
        include: {
          performedBy: {
            include: {
              designation: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Filter documents based on visibility rules
  const visibleDocuments = allApprovedDocs.filter((doc) => {
    // Rule 1: Owner can always see their documents
    if (doc.submittedById === currentUser.id) {
      return true;
    }

    // Rule 2: Users who were explicitly forwarded the document can see it
    const isForwardedToUser = doc.assignatories.some(
      (assignatory) => assignatory.userId === currentUser.id
    );
    if (isForwardedToUser) {
      return true;
    }

    // For President, VPADA, and VPAA: ONLY show documents that were forwarded to them
    // They should NOT see documents based on category/office or workflow involvement
    if (
      currentUser.role === "PRESIDENT" ||
      currentUser.role === "VPADA" ||
      currentUser.role === "VPAA"
    ) {
      // These roles can ONLY see documents they own or were forwarded to them
      // (already checked above, so return false here)
      return false;
    }

    // For other roles (DEAN, HR, INSTRUCTOR): Keep existing logic
    // Note: President, VPADA, and VPAA are already handled above with early return
    // They can only see documents they own or were forwarded to them

    // Rule 3: Get document's designation (from fileCategory)
    const documentDesignations = doc.fileCategory.designations;
    const documentDesignationNames = documentDesignations.map((d) => d.name);

    // Check if document is under Office of the President
    const isPresidentOffice = documentDesignationNames.some((name) =>
      name.toLowerCase().includes("president")
    );

    // Check if document is under Office of Academic Affairs (VPAA)
    const isVpaaOffice = documentDesignationNames.some(
      (name) =>
        name.toLowerCase().includes("academic affairs") ||
        name.toLowerCase().includes("vpaa")
    );

    // Rule 4: If document is under President office, other roles cannot see it
    // (President is already handled above with early return)
    if (isPresidentOffice) {
      return false; // Only President can see these, but they're already filtered above
    }

    // Rule 5: If document is under VPAA office, other roles cannot see it
    // (VPAA is already handled above with early return)
    if (isVpaaOffice) {
      return false; // Only VPAA can see these, but they're already filtered above
    }

    // Rule 6: Users involved in the workflow can see it (for non-privileged roles)
    const workflowUserIds = new Set<string>();
    workflowUserIds.add(doc.submittedById);
    doc.history.forEach((entry) => {
      if (entry.performedById) {
        workflowUserIds.add(entry.performedById);
      }
    });
    doc.assignatories.forEach((assignatory) => {
      workflowUserIds.add(assignatory.userId);
    });

    if (workflowUserIds.has(currentUser.id)) {
      return true;
    }

    // Default: user cannot see the document
    return false;
  });

  return visibleDocuments.map((doc) => ({
    id: doc.id,
    referenceId: doc.referenceId,
    title: doc.remarks || doc.fileCategory.name || doc.referenceId,
    attachments: doc.attachment ? [doc.attachment] : [],
    category: doc.fileCategory.name,
    priority: PRIORITY_DISPLAY_MAP[doc.priority],
    status: "Approved",
    submittedBy: doc.submittedBy
      ? `${doc.submittedBy.firstName} ${doc.submittedBy.lastName}`
      : "Unknown",
    createdAt: doc.updatedAt.toISOString(),
  }));
};

export const getArchivedDocumentsForUser = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  const where: Prisma.DocumentWhereInput = {
    archivedAt: { not: null },
  };

  if (currentUser.role === "INSTRUCTOR") {
    where.submittedById = currentUser.id;
  } else if (currentUser.role === "DEAN") {
    where.submittedBy = {
      designationId: currentUser.designationId,
    };
  } else if (!["VPAA", "VPADA", "PRESIDENT"].includes(currentUser.role)) {
    where.submittedById = currentUser.id;
  }

  const documents = await prisma.document.findMany({
    where,
    include: {
      fileCategory: true,
    },
    orderBy: {
      archivedAt: "desc",
    },
  });

  const mapped = documents.map((doc) => ({
    id: doc.id,
    referenceId: doc.referenceId,
    title: doc.remarks || doc.fileCategory.name || doc.referenceId,
    attachments: doc.attachment ? [doc.attachment] : [],
    category: doc.fileCategory.name,
    priority: PRIORITY_DISPLAY_MAP[doc.priority],
    status: "Archived" as const,
    createdAt: doc.createdAt.toISOString(),
    archivedAt: (doc.archivedAt ?? doc.updatedAt).toISOString(),
  }));

  const analytics = mapped.reduce(
    (acc, doc) => {
      acc.total += 1;
      switch (doc.priority) {
        case "High":
          acc.highPriority += 1;
          break;
        case "Medium":
          acc.mediumPriority += 1;
          break;
        default:
          acc.lowPriority += 1;
      }
      acc.categorySet.add(doc.category);
      if (!acc.latestArchivedAt || doc.archivedAt > acc.latestArchivedAt) {
        acc.latestArchivedAt = doc.archivedAt;
      }
      return acc;
    },
    {
      total: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
      latestArchivedAt: null as string | null,
      categorySet: new Set<string>(),
    }
  );

  return {
    documents: mapped,
    analytics: {
      total: analytics.total,
      highPriority: analytics.highPriority,
      mediumPriority: analytics.mediumPriority,
      lowPriority: analytics.lowPriority,
      uniqueCategories: analytics.categorySet.size,
      latestArchivedAt: analytics.latestArchivedAt,
    },
  };
};

const buildDashboardAnalytics = async (where: Prisma.DocumentWhereInput) => {
  const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
  const [
    totalSubmitted,
    pendingCount,
    approvedCount,
    rejectedCount,
    highPriorityCount,
    recentDocuments,
    pendingDocuments,
    documentsForTrend,
    documentsForCategories,
  ] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.count({ where: { ...where, status: "PENDING" } }),
    prisma.document.count({ where: { ...where, status: "APPROVED" } }),
    prisma.document.count({ where: { ...where, status: "REJECTED" } }),
    prisma.document.count({ where: { ...where, priority: "HIGH" } }),
    prisma.document.findMany({
      where,
      include: {
        fileCategory: true,
        submittedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.document.findMany({
      where: { ...where, status: "PENDING" },
      include: {
        fileCategory: true,
        submittedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.document.findMany({
      where: { ...where, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
    prisma.document.findMany({
      where,
      select: { fileCategory: { select: { name: true } } },
    }),
  ]);

  const monthBuckets = Array.from({ length: 6 }).map((_, index) => {
    const date = startOfMonth(subMonths(new Date(), 5 - index));
    return {
      label: format(date, "MMM"),
      count: 0,
      key: format(date, "yyyy-MM"),
    };
  });

  documentsForTrend.forEach((doc) => {
    const key = format(startOfMonth(doc.createdAt), "yyyy-MM");
    const bucket = monthBuckets.find((b) => b.key === key);
    if (bucket) {
      bucket.count += 1;
    }
  });

  const monthlyActivity = monthBuckets.map(({ key, ...rest }) => rest);

  const categoryMap = new Map<string, number>();
  documentsForCategories.forEach((doc) => {
    const name = doc.fileCategory?.name ?? "Uncategorized";
    categoryMap.set(name, (categoryMap.get(name) ?? 0) + 1);
  });

  const categoryBreakdown = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  return {
    summary: {
      totalSubmitted,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      highPriority: highPriorityCount,
      actionRequired: pendingCount,
    },
    recentDocuments: recentDocuments.map((doc) => ({
      id: doc.id,
      title: doc.remarks || doc.fileCategory.name || doc.referenceId,
      referenceId: doc.referenceId,
      status: STATUS_DISPLAY_MAP[doc.status],
      submittedAt: doc.createdAt.toISOString(),
      category: doc.fileCategory.name,
      owner:
        doc.submittedBy?.firstName && doc.submittedBy?.lastName
          ? `${doc.submittedBy.firstName} ${doc.submittedBy.lastName}`
          : undefined,
    })),
    pendingDocuments: pendingDocuments.map((doc) => ({
      id: doc.id,
      title: doc.remarks || doc.fileCategory.name || doc.referenceId,
      referenceId: doc.referenceId,
      submittedAt: doc.createdAt.toISOString(),
      category: doc.fileCategory.name,
      priority: PRIORITY_DISPLAY_MAP[doc.priority],
      owner:
        doc.submittedBy?.firstName && doc.submittedBy?.lastName
          ? `${doc.submittedBy.firstName} ${doc.submittedBy.lastName}`
          : undefined,
    })),
    monthlyActivity,
    categoryBreakdown,
  };
};

export const getDashboardAnalytics = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.id },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  const where: Prisma.DocumentWhereInput = {};
  if (currentUser.role === "INSTRUCTOR") {
    where.submittedById = currentUser.id;
  } else if (currentUser.role === "DEAN" && currentUser.designationId) {
    where.submittedBy = { designationId: currentUser.designationId };
  } else if (!["VPAA", "VPADA", "PRESIDENT"].includes(currentUser.role)) {
    where.submittedById = currentUser.id;
  }

  return buildDashboardAnalytics(where);
};

export const getDeanDashboardAnalytics = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const dean = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true, designationId: true },
  });

  if (!dean || dean.role !== "DEAN") {
    throw new Error("Forbidden");
  }

  if (!dean.designationId) {
    throw new Error("Dean is not associated with a department.");
  }

  const baseWhere: Prisma.DocumentWhereInput = {
    submittedBy: { designationId: dean.designationId },
  };

  const analytics = await buildDashboardAnalytics(baseWhere);

  const facultyMembers = await prisma.user.findMany({
    where: { designationId: dean.designationId },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });

  const grouped = await prisma.document.groupBy({
    by: ["submittedById", "status"],
    where: baseWhere,
    _count: { _all: true },
  });

  const performanceMap = new Map<
    string,
    { total: number; pending: number; approved: number; rejected: number }
  >();

  grouped.forEach((entry) => {
    if (!entry.submittedById) {
      return;
    }
    if (!performanceMap.has(entry.submittedById)) {
      performanceMap.set(entry.submittedById, {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });
    }
    const bucket = performanceMap.get(entry.submittedById)!;
    bucket.total += entry._count._all;
    if (entry.status === "PENDING") bucket.pending += entry._count._all;
    if (entry.status === "APPROVED") bucket.approved += entry._count._all;
    if (entry.status === "REJECTED") bucket.rejected += entry._count._all;
  });

  const teamPerformance = facultyMembers
    .map((member) => {
      const metrics = performanceMap.get(member.id) ?? {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };
      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        role: member.role,
        ...metrics,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    ...analytics,
    teamPerformance,
  };
};

export const getVpaaDashboardAnalytics = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const vpaa = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true },
  });

  if (
    !vpaa ||
    (vpaa.role !== "VPAA" && vpaa.role !== "VPADA" && vpaa.role !== "PRESIDENT")
  ) {
    throw new Error("Forbidden");
  }

  // No restrictions - show all documents
  const baseWhere: Prisma.DocumentWhereInput = {};

  const analytics = await buildDashboardAnalytics(baseWhere);

  // Get all users who have submitted documents for team performance
  const allSubmitters = await prisma.user.findMany({
    where: {
      documentsSubmitted: {
        some: {},
      },
    },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });

  const grouped = await prisma.document.groupBy({
    by: ["submittedById", "status"],
    where: baseWhere,
    _count: { _all: true },
  });

  const performanceMap = new Map<
    string,
    { total: number; pending: number; approved: number; rejected: number }
  >();

  grouped.forEach((entry) => {
    if (!entry.submittedById) {
      return;
    }
    if (!performanceMap.has(entry.submittedById)) {
      performanceMap.set(entry.submittedById, {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });
    }
    const bucket = performanceMap.get(entry.submittedById)!;
    bucket.total += entry._count._all;
    if (entry.status === "PENDING") bucket.pending += entry._count._all;
    if (entry.status === "APPROVED") bucket.approved += entry._count._all;
    if (entry.status === "REJECTED") bucket.rejected += entry._count._all;
  });

  const teamPerformance = allSubmitters
    .map((member) => {
      const metrics = performanceMap.get(member.id) ?? {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };
      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        role: member.role,
        ...metrics,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    ...analytics,
    teamPerformance,
  };
};

export const getHrDashboardAnalytics = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const hr = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true },
  });

  if (!hr || hr.role !== "HR") {
    throw new Error("Forbidden");
  }

  // No restrictions - show all documents
  const baseWhere: Prisma.DocumentWhereInput = {};

  const analytics = await buildDashboardAnalytics(baseWhere);

  // Get all users who have submitted documents for team performance
  const allSubmitters = await prisma.user.findMany({
    where: {
      documentsSubmitted: {
        some: {},
      },
    },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: { firstName: "asc" },
  });

  const grouped = await prisma.document.groupBy({
    by: ["submittedById", "status"],
    where: baseWhere,
    _count: { _all: true },
  });

  const performanceMap = new Map<
    string,
    { total: number; pending: number; approved: number; rejected: number }
  >();

  grouped.forEach((entry) => {
    if (!entry.submittedById) {
      return;
    }
    if (!performanceMap.has(entry.submittedById)) {
      performanceMap.set(entry.submittedById, {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      });
    }
    const bucket = performanceMap.get(entry.submittedById)!;
    bucket.total += entry._count._all;
    if (entry.status === "PENDING") bucket.pending += entry._count._all;
    if (entry.status === "APPROVED") bucket.approved += entry._count._all;
    if (entry.status === "REJECTED") bucket.rejected += entry._count._all;
  });

  const teamPerformance = allSubmitters
    .map((member) => {
      const metrics = performanceMap.get(member.id) ?? {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };
      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        role: member.role,
        ...metrics,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    ...analytics,
    teamPerformance,
  };
};
