"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { NotificationItem } from "./notification-item";
import type { Notification } from "@/shared/models/notification";

interface NotificationListProps {
  onNotificationRead?: () => void;
  onClose?: () => void;
}

export function NotificationList({
  onNotificationRead,
  onClose,
}: NotificationListProps) {
  const t = useTranslations("notification");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/notifications/list?page=${page}&limit=10`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          setNotifications(data.data.data);
          setHasMore(
            data.data.pagination.page < data.data.pagination.totalPages,
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date() }
              : n,
          ),
        );
        onNotificationRead?.();
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">{t("no_notifications")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="divide-y">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
            onClose={onClose}
          />
        ))}
      </div>
      {hasMore && (
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">{t("view_more_hint")}</p>
        </div>
      )}
    </ScrollArea>
  );
}
