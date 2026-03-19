import { getTranslations, setRequestLocale } from "next-intl/server";

import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { TableCard } from "@/shared/blocks/table";
import { getEditableStaticPages } from "@/shared/models/static-page";
import { Crumb } from "@/shared/types/blocks/common";
import { Table } from "@/shared/types/blocks/table";

export default async function PagesAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.POSTS_READ,
    redirectUrl: "/admin/no-permission",
    locale,
  });

  const t = await getTranslations("admin.pages");
  const pages = await getEditableStaticPages();

  const rows = pages.map((item) => ({
    title: item.override?.title || item.title || item.slug,
    slug: item.slug,
    locale: item.locale,
    sourceFile: item.absolutePath.replace(`${process.cwd()}/`, ""),
    overrideStatus: item.override
      ? t("list.status.overridden")
      : t("list.status.default"),
    updatedAt: item.override?.updatedAt,
    url: item.url,
  }));

  const crumbs: Crumb[] = [
    { title: t("list.crumbs.admin"), url: "/admin" },
    { title: t("list.crumbs.pages"), is_active: true },
  ];

  const table: Table = {
    columns: [
      { name: "title", title: t("fields.title") },
      { name: "slug", title: t("fields.slug") },
      { name: "locale", title: t("fields.locale") },
      { name: "sourceFile", title: t("fields.source_file") },
      { name: "overrideStatus", title: t("fields.override_status") },
      {
        name: "updatedAt",
        title: t("fields.updated_at"),
        type: "time",
        placeholder: "-",
      },
      {
        name: "action",
        title: "",
        type: "dropdown",
        callback: (item: (typeof rows)[number]) => [
          {
            name: "edit",
            title: t("list.buttons.edit"),
            icon: "RiEditLine",
            url: `/admin/pages/edit?slug=${encodeURIComponent(item.slug)}&targetLocale=${item.locale}`,
          },
          {
            name: "view",
            title: t("list.buttons.view"),
            icon: "RiEyeLine",
            url: item.url,
            target: "_blank",
          },
        ],
      },
    ],
    data: rows,
    emptyMessage: t("list.empty"),
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t("list.title")}
          description={t("list.description")}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
