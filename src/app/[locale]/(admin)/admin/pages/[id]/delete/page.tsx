import { getTranslations, setRequestLocale } from "next-intl/server";

import { redirect } from "@/core/i18n/navigation";
import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Empty } from "@/shared/blocks/common";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  deleteCustomHtmlPageById,
  getCustomHtmlPageById,
  getCustomHtmlPageDisplaySlug,
  getCustomHtmlPageUrl,
} from "@/shared/models/custom-html-page";
import { Crumb } from "@/shared/types/blocks/common";

export default async function DeleteHtmlPageAdminPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.POSTS_WRITE,
    redirectUrl: "/admin/no-permission",
    locale,
  });

  const t = await getTranslations("admin.pages");
  const page = await getCustomHtmlPageById(id);

  if (!page) {
    return <Empty message={t("form.messages.not_found")} />;
  }

  async function deleteAction() {
    "use server";

    await requirePermission({
      code: PERMISSIONS.POSTS_WRITE,
      redirectUrl: "/admin/no-permission",
      locale,
    });

    await deleteCustomHtmlPageById(page.id);
    redirect({
      href: "/admin/pages",
      locale,
    });
  }

  const previewUrl = getCustomHtmlPageUrl({
    slug: page.slug,
    locale: page.locale,
  });

  const crumbs: Crumb[] = [
    { title: t("form.edit.crumbs.admin"), url: "/admin" },
    { title: t("form.edit.crumbs.pages"), url: "/admin/pages" },
    { title: t("delete.crumbs.delete"), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t("delete.title")}
          description={t("delete.description")}
        />
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{getCustomHtmlPageDisplaySlug(page.slug)}</CardTitle>
            <CardDescription>{previewUrl}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 text-sm">
              <p>{t("delete.messages.confirm")}</p>
              <p className="text-muted-foreground">
                {t("delete.messages.only_custom_html")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <form action={deleteAction}>
                <Button type="submit" variant="destructive" size="sm">
                  {t("delete.buttons.confirm")}
                </Button>
              </form>
              <Button asChild variant="outline" size="sm">
                <a href={`/admin/pages/${page.id}/edit`}>
                  {t("delete.buttons.cancel")}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
