import { getTranslations, setRequestLocale } from "next-intl/server";

import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { NotificationManagement } from "@/shared/blocks/admin/notification-management";
import { Crumb, Tab } from "@/shared/types/blocks/common";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: number;
    pageSize?: number;
    type?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.NOTIFICATIONS_READ,
    redirectUrl: "/admin/no-permission",
    locale,
  });

  const t = await getTranslations("admin.notifications");

  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  const crumbs: Crumb[] = [
    { title: t("list.crumbs.admin"), url: "/admin" },
    { title: t("list.crumbs.notifications"), is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: "all",
      title: t("list.tabs.all"),
      url: "/admin/notifications",
      is_active: !type || type === "all",
    },
    {
      name: "system",
      title: t("list.tabs.system"),
      url: "/admin/notifications?type=system",
      is_active: type === "system",
    },
    {
      name: "video_complete",
      title: t("list.tabs.video_complete"),
      url: "/admin/notifications?type=video_complete",
      is_active: type === "video_complete",
    },
    {
      name: "announcement",
      title: t("list.tabs.announcement"),
      url: "/admin/notifications?type=announcement",
      is_active: type === "announcement",
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t("list.title")} tabs={tabs} />
        <NotificationManagement type={type} page={page} limit={limit} />
      </Main>
    </>
  );
}
