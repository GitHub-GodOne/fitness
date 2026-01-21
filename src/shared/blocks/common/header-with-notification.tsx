"use client";

import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";

import { Link } from "@/core/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { NotificationBell } from "@/shared/components/notification";
import { useAppContext } from "@/shared/contexts/app";

interface HeaderWithNotificationProps {
  title?: string;
  showNotification?: boolean;
  onMenuClick?: () => void;
}

export function HeaderWithNotification({
  title,
  showNotification = true,
  onMenuClick,
}: HeaderWithNotificationProps) {
  const t = useTranslations("common");
  const { user } = useAppContext();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {title && (
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold">{title}</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 只有登录用户才显示通知铃铛 */}
          {user && showNotification && <NotificationBell />}

          {/* 其他头部元素，如用户菜单等 */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm sm:inline-block">
                {user.name}
              </span>
            </div>
          ) : (
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                {t("sign_in")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
