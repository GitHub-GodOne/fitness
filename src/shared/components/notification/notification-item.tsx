"use client";

import { MessageCircle, Video, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/core/i18n/navigation";

import { cn } from "@/shared/lib/utils";
import type { Notification } from "@/shared/models/notification";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose?: () => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const t = useTranslations("notification");
  const router = useRouter();

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    if (notification.link) {
      router.push(notification.link);
      onClose?.();
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case "comment_reply":
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case "video_complete":
        return <Video className="h-5 w-5 text-green-500" />;
      case "image_complete":
        return <CheckCircle2 className="h-5 w-5 text-purple-500" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("time.just_now");
    if (diffMins < 60) return t("time.minutes_ago", { count: diffMins });
    if (diffHours < 24) return t("time.hours_ago", { count: diffHours });
    if (diffDays < 7) return t("time.days_ago", { count: diffDays });

    return notificationDate.toLocaleDateString();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex cursor-pointer gap-3 p-4 transition-colors hover:bg-accent",
        !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20",
      )}
    >
      <div className="flex-shrink-0 pt-1">{getIcon()}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium",
              !notification.isRead && "font-semibold",
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.content}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}
