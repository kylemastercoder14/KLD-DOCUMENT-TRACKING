"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export type NotificationType =
  | "DOCUMENT_SUBMITTED"
  | "DOCUMENT_ASSIGNED"
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_REJECTED"
  | "DOCUMENT_REQUIRES_ACTION"
  | "DOCUMENT_UPDATED"
  | "DOCUMENT_ARCHIVED"
  | "SYSTEM_ANNOUNCEMENT";

export interface CreateNotificationInput {
  title: string;
  description: string;
  type: NotificationType;
  userId: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(input: CreateNotificationInput) {
  try {
    const notification = await prisma.notification.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        userId: input.userId,
        link: input.link,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">
) {
  try {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        prisma.notification.create({
          data: {
            title: input.title,
            description: input.description,
            type: input.type,
            userId,
            link: input.link,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          },
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error("Error creating notifications:", error);
    throw new Error("Failed to create notifications");
  }
}

/**
 * Get all notifications for the current user
 */
export async function getNotifications() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return notifications.map((notification) => ({
    ...notification,
    metadata: notification.metadata
      ? JSON.parse(notification.metadata)
      : null,
  }));
}

/**
 * Get unread notifications count
 */
export async function getUnreadNotificationCount() {
  const session = await getServerSession();
  if (!session) {
    return 0;
  }

  const count = await prisma.notification.count({
    where: {
      userId: session.id,
      isRead: false,
    },
  });

  return count;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== session.id) {
    throw new Error("Notification not found or unauthorized");
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true };
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string) {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== session.id) {
    throw new Error("Notification not found or unauthorized");
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { success: true };
}

/**
 * Delete all read notifications
 */
export async function deleteAllReadNotifications() {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  await prisma.notification.deleteMany({
    where: {
      userId: session.id,
      isRead: true,
    },
  });

  return { success: true };
}

