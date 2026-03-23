import { getTranslations, setRequestLocale } from "next-intl/server";

import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { TableCard } from "@/shared/blocks/table";
import {
  getCustomHtmlPageDisplaySlug,
  getCustomHtmlPageUrl,
  getCustomHtmlPages,
} from "@/shared/models/custom-html-page";
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
  const [pages, customHtmlPages] = await Promise.all([
    getEditableStaticPages(),
    getCustomHtmlPages(),
  ]);

  const rows = [
    ...pages.map((item) => ({
      id: `mdx:${item.locale}:${item.slug}`,
      pageType: t("list.types.mdx"),
      title: item.override?.title || item.title || item.slug,
      slug: item.slug,
      locale: item.locale,
      sourceFile: item.absolutePath.replace(`${process.cwd()}/`, ""),
      overrideStatus: item.override
        ? t("list.status.overridden")
        : t("list.status.default"),
      updatedAt: item.override?.updatedAt,
      url: item.url,
      editUrl: `/admin/pages/edit?slug=${encodeURIComponent(item.slug)}&targetLocale=${item.locale}`,
      editLabel: t("list.buttons.edit"),
      deleteUrl: undefined,
    })),
    ...customHtmlPages.map((item) => ({
      id: item.id,
      pageType: t("list.types.html"),
      title: item.title || getCustomHtmlPageDisplaySlug(item.slug),
      slug: getCustomHtmlPageDisplaySlug(item.slug),
      locale: item.locale,
      sourceFile: t("list.source.database_html"),
      overrideStatus: t("list.status.custom_html"),
      updatedAt: item.updatedAt,
      url: getCustomHtmlPageUrl({
        slug: item.slug,
        locale: item.locale,
      }),
      editUrl: `/admin/pages/${item.id}/edit`,
      editLabel: t("list.buttons.edit_html"),
      deleteUrl: `/admin/pages/${item.id}/delete`,
    })),
  ].sort((a, b) => {
    const slugCompare = a.slug.localeCompare(b.slug);
    if (slugCompare !== 0) {
      return slugCompare;
    }

    return a.locale.localeCompare(b.locale);
  });

  const crumbs: Crumb[] = [
    { title: t("list.crumbs.admin"), url: "/admin" },
    { title: t("list.crumbs.pages"), is_active: true },
  ];

  const table: Table = {
    columns: [
      { name: "pageType", title: t("fields.page_type") },
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
        callback: (item: (typeof rows)[number]) => {
          const actions: any[] = [
            {
              name: "edit",
              title: item.editLabel,
              icon: "RiEditLine",
              url: item.editUrl,
            },
          ];

          if (item.pageType === t("list.types.html") && item.deleteUrl) {
            actions.push({
              name: "delete",
              title: t("list.buttons.delete"),
              icon: "RiDeleteBinLine",
              url: item.deleteUrl,
            });
          }

          actions.push({
            name: "view",
            title: t("list.buttons.view"),
            icon: "RiEyeLine",
            url: item.url,
            target: "_blank",
          });

          return actions;
        },
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
          actions={[
            {
              title: t("list.buttons.add_html"),
              url: "/admin/pages/add",
              icon: "RiAddLine",
            },
          ]}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
