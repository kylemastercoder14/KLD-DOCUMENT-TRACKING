/**
 * Helper functions for creating notifications in the document tracking system
 */

import {
  createNotification,
  createNotificationsForUsers,
  type NotificationType,
} from "@/actions/notification";

/**
 * Create a notification when a document is submitted
 */
export async function notifyDocumentSubmitted(
  userId: string,
  documentTitle: string,
  documentId: string
) {
  return createNotification({
    title: "Document Submitted",
    description: `Your document "${documentTitle}" has been submitted successfully.`,
    type: "DOCUMENT_SUBMITTED",
    userId,
    link: `/instructor/designate-document`,
    metadata: { documentId, documentTitle },
  });
}

/**
 * Create notifications when a document is assigned to users
 */
export async function notifyDocumentAssigned(
  userIds: string[],
  documentTitle: string,
  documentId: string,
  assignedBy: string
) {
  return createNotificationsForUsers(userIds, {
    title: "New Document Assignment",
    description: `You have been assigned to review "${documentTitle}".`,
    type: "DOCUMENT_ASSIGNED",
    link: `/instructor/designate-document`,
    metadata: { documentId, documentTitle, assignedBy },
  });
}

/**
 * Create a notification when a document is approved
 */
export async function notifyDocumentApproved(
  userId: string,
  documentTitle: string,
  documentId: string,
  approvedBy: string
) {
  return createNotification({
    title: "Document Approved",
    description: `Your document "${documentTitle}" has been approved by ${approvedBy}.`,
    type: "DOCUMENT_APPROVED",
    userId,
    link: `/instructor/designate-document`,
    metadata: { documentId, documentTitle, approvedBy },
  });
}

/**
 * Create a notification when a document is rejected
 */
export async function notifyDocumentRejected(
  userId: string,
  documentTitle: string,
  documentId: string,
  rejectedBy: string,
  reason?: string
) {
  return createNotification({
    title: "Document Rejected",
    description: `Your document "${documentTitle}" has been rejected by ${rejectedBy}.${reason ? ` Reason: ${reason}` : ""}`,
    type: "DOCUMENT_REJECTED",
    userId,
    link: `/instructor/designate-document`,
    metadata: { documentId, documentTitle, rejectedBy, reason },
  });
}

/**
 * Create a notification when a document requires action
 */
export async function notifyDocumentRequiresAction(
  userId: string,
  documentTitle: string,
  documentId: string,
  actionRequired: string
) {
  return createNotification({
    title: "Action Required",
    description: `Your document "${documentTitle}" requires your action: ${actionRequired}.`,
    type: "DOCUMENT_REQUIRES_ACTION",
    userId,
    link: `/instructor/designate-document`,
    metadata: { documentId, documentTitle, actionRequired },
  });
}

/**
 * Create a notification when a document is updated
 */
export async function notifyDocumentUpdated(
  userId: string,
  documentTitle: string,
  documentId: string,
  updatedBy: string
) {
  return createNotification({
    title: "Document Updated",
    description: `The document "${documentTitle}" has been updated by ${updatedBy}.`,
    type: "DOCUMENT_UPDATED",
    userId,
    link: `/instructor/designate-document`,
    metadata: { documentId, documentTitle, updatedBy },
  });
}

/**
 * Create a notification when a document is archived
 */
export async function notifyDocumentArchived(
  userId: string,
  documentTitle: string,
  documentId: string
) {
  return createNotification({
    title: "Document Archived",
    description: `Your document "${documentTitle}" has been archived.`,
    type: "DOCUMENT_ARCHIVED",
    userId,
    link: `/instructor/archived-documents`,
    metadata: { documentId, documentTitle },
  });
}

/**
 * Create a system announcement notification
 */
export async function notifySystemAnnouncement(
  userIds: string[],
  title: string,
  description: string,
  link?: string
) {
  return createNotificationsForUsers(userIds, {
    title,
    description,
    type: "SYSTEM_ANNOUNCEMENT",
    link,
  });
}

