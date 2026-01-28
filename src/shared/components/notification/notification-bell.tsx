"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { NotificationList } from "./notification-list";
import { useAppContext } from "@/shared/contexts/app";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { user } = useAppContext();
  const t = useTranslations("notification");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    // Skip API call if user is not logged in
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetch("/api/notifications/unread-count");
      if (response.ok) {
        const data = await response.json();
        if (data.code === 0) {
          setUnreadCount(data.data.unreadCount);
        }
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative text-foreground hover:text-primary ${className}`}
          aria-label={t("bell_aria_label")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 sm:w-96" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">{t("title")}</h3>
          {unreadCount > 0 && (
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
            fetchUnreadCount();
          }}
          onClose={() => setIsOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
