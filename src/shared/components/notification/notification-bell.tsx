"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { NotificationList } from "./notification-list";
import { NotificationDetailDialog } from "./notification-detail-dialog";
import { useAppContext } from "@/shared/contexts/app";
import type { Notification } from "@/shared/models/notification";

interface NotificationBellProps {
  className?: string;
  variant?: "icon" | "menu-item";
}

export function NotificationBell({
  className,
  variant = "icon",
}: NotificationBellProps) {
  const { configs, isConfigsLoaded } = useAppContext();

  if (!isConfigsLoaded) {
    return null;
  }

  if (configs.notification_bell_enabled === "false") {
    return null;
  }

  return (
    <NotificationBellContent className={className} variant={variant} />
  );
}

function NotificationBellContent({
  className,
  variant,
}: NotificationBellProps) {
  const { unreadNotificationCount, refreshUnreadNotificationCount, user } =
    useAppContext();
  const t = useTranslations("notification");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        await refreshUnreadNotificationCount();
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={
              variant === "menu-item"
                ? `relative flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground ${className}`
                : `relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground ${className}`
            }
            aria-label={t("bell_aria_label")}
          >
            <Bell className="h-5 w-5" />
            {variant === "menu-item" ? (
              <span className="flex-1 text-left">{t("title")}</span>
            ) : null}
            {unreadNotificationCount > 0 && (
              <span
                className={
                  variant === "menu-item"
                    ? "ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    : "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse"
                }
              >
                {unreadNotificationCount > 99
                  ? "99+"
                  : unreadNotificationCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-80 p-0 sm:w-96"
          align={variant === "menu-item" ? "start" : "end"}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">{t("title")}</h3>
            {unreadNotificationCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="h-8 text-xs"
              >
                {t("mark_all_read")}
              </Button>
            )}
          </div>
          <NotificationList
            onNotificationRead={() => {
              void refreshUnreadNotificationCount();
            }}
            onViewDetail={(n) => {
              setIsOpen(false);
              setSelectedNotification(n);
            }}
            onClose={() => setIsOpen(false)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <NotificationDetailDialog
        notification={selectedNotification}
        open={!!selectedNotification}
        onOpenChange={(open) => {
          if (!open) setSelectedNotification(null);
        }}
      />
    </>
  );
}
