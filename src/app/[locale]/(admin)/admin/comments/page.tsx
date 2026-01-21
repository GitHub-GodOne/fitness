import { getTranslations, setRequestLocale } from "next-intl/server";

import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { CommentManagement } from "@/shared/blocks/dashboard/comment-management";
import { Crumb, Tab } from "@/shared/types/blocks/common";

export default async function CommentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: number;
    pageSize?: number;
    status?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has admin access
  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: "/admin/no-permission",
    locale,
  });

  const t = await getTranslations("admin.comments");

  const { page: pageNum, pageSize, status } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const crumbs: Crumb[] = [
    { title: t("list.crumbs.admin"), url: "/admin" },
    { title: t("list.crumbs.comments"), is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: "all",
      title: t("list.tabs.all"),
      url: "/admin/comments",
      is_active: !status || status === "all",
    },
    {
      name: "visible",
      title: t("list.tabs.visible"),
      url: "/admin/comments?status=visible",
      is_active: status === "visible",
    },
    {
      name: "hidden",
      title: t("list.tabs.hidden"),
      url: "/admin/comments?status=hidden",
      is_active: status === "hidden",
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t("list.title")} tabs={tabs} />
        <CommentManagement status={status} page={page} limit={limit} />
      </Main>
    </>
  );
}
