"use client";

import { Bell, MessageCircle, Video, CheckCircle2, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/core/i18n/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import type { Notification } from "@/shared/models/notification";

interface NotificationDetailDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDetailDialog({
  notification,
  open,
  onOpenChange,
}: NotificationDetailDialogProps) {
  const t = useTranslations("notification");
  const router = useRouter();

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case "comment_reply":
        return <MessageCircle className="h-6 w-6 text-blue-500" />;
      case "video_complete":
        return <Video className="h-6 w-6 text-green-500" />;
      case "image_complete":
        return <CheckCircle2 className="h-6 w-6 text-purple-500" />;
      case "system":
      case "announcement":
        return <Bell className="h-6 w-6 text-orange-500" />;
      default:
        return <CheckCircle2 className="h-6 w-6 text-gray-500" />;
    }
  };

  const handleViewLink = () => {
    if (notification.link) {
      router.push(notification.link);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {t("detail.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base">{notification.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {notification.content}
          </p>
          {notification.link && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleViewLink}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("detail.go_to_link")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
