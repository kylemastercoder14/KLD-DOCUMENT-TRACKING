"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteAllReadNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/actions/notification";
import { cn } from "@/lib/utils";

type NotificationItem = Awaited<ReturnType<typeof getNotifications>>[number];

export const Client = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });

  const deleteReadMutation = useMutation({
    mutationFn: deleteAllReadNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notification-count"] });
    },
  });

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="space-y-6">
      <Heading title="Notifications" description="All alerts related to your documents and account." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span>
            {notifications.length
              ? `${notifications.length} total • ${
                  notifications.filter((n) => !n.isRead).length
                } unread`
              : "No notifications yet."}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "primary" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Unread
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={!notifications.some((n) => !n.isRead) || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-destructive"
            disabled={
              !notifications.some((n) => n.isRead) || deleteReadMutation.isPending
            }
            onClick={() => deleteReadMutation.mutate()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear read
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card/60 p-4">
        <ScrollArea className="h-[520px]">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-sm text-destructive">
              {(error as Error)?.message ?? "Failed to load notifications."}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {filter === "unread"
                ? "You have no unread notifications."
                : "No notifications have been generated yet."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group rounded-xl border p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/60",
                    !notification.isRead && "bg-primary/5 border-primary/30"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        notification.isRead
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {notification.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm line-clamp-1">
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(notification.createdAt), "PPpp")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteMutation.mutate(notification.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};


