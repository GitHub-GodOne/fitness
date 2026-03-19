import { getTranslations, setRequestLocale } from "next-intl/server";

import { locales } from "@/config/locale";
import { Link, redirect } from "@/core/i18n/navigation";
import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Empty } from "@/shared/blocks/common";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { FormCard } from "@/shared/blocks/form";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { getUserInfo } from "@/shared/models/user";
import {
  deletePageOverride,
  getEditableStaticPage,
  upsertStaticPageOverrideFromEditor,
} from "@/shared/models/static-page";
import { Crumb } from "@/shared/types/blocks/common";
import { Form } from "@/shared/types/blocks/form";

export default async function PageOverrideEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ slug?: string; targetLocale?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.POSTS_WRITE,
    redirectUrl: "/admin/no-permission",
    locale,
  });

  const t = await getTranslations("admin.pages");
  const { slug, targetLocale } = await searchParams;
  const normalizedSlug = typeof slug === "string" ? slug.trim() : "";
  const normalizedTargetLocale =
    typeof targetLocale === "string" &&
    locales.includes(targetLocale.trim()) &&
    targetLocale.trim()
      ? targetLocale.trim()
      : locale;
  const messages = {
    signin: t("edit.messages.signin"),
    saved: t("edit.messages.saved"),
    reset: t("edit.messages.reset"),
  };

  if (!normalizedSlug) {
    return <Empty message={t("edit.messages.not_found")} />;
  }

  const editablePage = await getEditableStaticPage({
    slug: normalizedSlug,
    locale: normalizedTargetLocale,
  });

  if (!editablePage) {
    return <Empty message={t("edit.messages.not_found")} />;
  }

  const crumbs: Crumb[] = [
    { title: t("edit.crumbs.admin"), url: "/admin" },
    { title: t("edit.crumbs.pages"), url: "/admin/pages" },
    { title: t("edit.crumbs.edit"), is_active: true },
  ];

  const relativeSourceFile = editablePage.absolutePath.replace(
    `${process.cwd()}/`,
    "",
  );
  const currentStatus = editablePage.override
    ? t("edit.cards.overridden_status")
    : t("edit.cards.default_status");
  const pageSlug = editablePage.slug;
  const pageLocale = editablePage.locale;

  const form: Form = {
    fields: [
      {
        name: "title",
        type: "text",
        title: t("fields.title"),
      },
      {
        name: "description",
        type: "textarea",
        title: t("fields.description"),
      },
      {
        name: "content",
        type: "markdown_editor",
        title: t("fields.content"),
        attributes: {
          className: "min-h-[420px]",
        },
      },
    ],
    passby: {
      slug: editablePage.slug,
      targetLocale: editablePage.locale,
      baseTitle: editablePage.title,
      baseDescription: editablePage.description,
      baseContent: editablePage.sourceContent,
    },
    data: {
      title: editablePage.override?.title ?? editablePage.title,
      description:
        editablePage.override?.description ?? editablePage.description,
      content: editablePage.override?.content ?? editablePage.sourceContent,
    },
    submit: {
      button: {
        title: t("edit.buttons.submit"),
      },
      handler: async (data, passby) => {
        "use server";

        const user = await getUserInfo();
        if (!user) {
          return {
            status: "error",
            message: messages.signin,
          } as const;
        }

        const result = await upsertStaticPageOverrideFromEditor({
          slug: passby.slug,
          locale: passby.targetLocale,
          baseTitle: passby.baseTitle,
          baseDescription: passby.baseDescription,
          baseContent: passby.baseContent,
          title: (data.get("title") as string) || "",
          description: (data.get("description") as string) || "",
          content: (data.get("content") as string) || "",
          updatedBy: user.id,
        });

        return {
          status: "success",
          message: result.action === "saved" ? messages.saved : messages.reset,
          redirect_url: "/admin/pages",
        };
      },
    },
  };

  async function resetOverrideAction() {
    "use server";

    await requirePermission({
      code: PERMISSIONS.POSTS_WRITE,
      redirectUrl: "/admin/no-permission",
      locale,
    });

    await deletePageOverride({
      slug: pageSlug,
      locale: pageLocale,
    });

    redirect({
      href: `/admin/pages/edit?slug=${encodeURIComponent(pageSlug)}&targetLocale=${pageLocale}`,
      locale,
    });
  }

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t("edit.title")}
          description={t("edit.description")}
        />
        <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <FormCard form={form} className="md:max-w-none" />
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("edit.cards.source_title")}</CardTitle>
                <CardDescription>
                  {t("edit.cards.source_description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    {t("fields.slug")}
                  </div>
                  <div className="mt-1 break-all font-medium">
                    {editablePage.slug}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    {t("fields.locale")}
                  </div>
                  <div className="mt-1 font-medium">{editablePage.locale}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    {t("edit.cards.route")}
                  </div>
                  <div className="mt-1 break-all font-medium">
                    {editablePage.url}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    {t("edit.cards.file")}
                  </div>
                  <div className="mt-1 break-all font-medium">
                    {relativeSourceFile}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    {t("edit.cards.current_status")}
                  </div>
                  <div className="mt-1 font-medium">{currentStatus}</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin/pages">{t("edit.buttons.back")}</Link>
                  </Button>
                  <Button asChild size="sm">
                    <a href={editablePage.url} target="_blank" rel="noreferrer">
                      {t("edit.buttons.preview")}
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
            {editablePage.override ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("edit.cards.override_title")}</CardTitle>
                  <CardDescription>
                    {t("edit.cards.override_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={resetOverrideAction}>
                    <Button type="submit" variant="outline" size="sm">
                      {t("edit.buttons.reset")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </Main>
    </>
  );
}
