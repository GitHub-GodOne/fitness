import { getTranslations, setRequestLocale } from "next-intl/server";

import { defaultLocale, locales } from "@/config/locale";
import { redirect } from "@/core/i18n/navigation";
import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Empty } from "@/shared/blocks/common";
import { HtmlPageEditorForm } from "@/shared/blocks/admin/html-page-editor-form";
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
  getCustomHtmlPageDisplaySlug,
  getCustomHtmlPageById,
  getCustomHtmlPageRevisionById,
  getCustomHtmlPageRevisions,
  getCustomHtmlPageUrl,
  saveCustomHtmlPage,
  setCustomHtmlPageActiveState,
  validateCustomHtmlPageInput,
} from "@/shared/models/custom-html-page";
import { getUserInfo } from "@/shared/models/user";
import { Crumb } from "@/shared/types/blocks/common";

type EditorState = {
  status?: "error" | "success";
  message?: string;
  redirectUrl?: string;
};

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

export default async function EditHtmlPageAdminPage({
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
  const [page, revisions] = await Promise.all([
    getCustomHtmlPageById(id),
    getCustomHtmlPageRevisions(id),
  ]);

  if (!page) {
    return <Empty message={t("form.messages.not_found")} />;
  }

  const crumbs: Crumb[] = [
    { title: t("form.edit.crumbs.admin"), url: "/admin" },
    { title: t("form.edit.crumbs.pages"), url: "/admin/pages" },
    { title: t("form.edit.crumbs.edit"), is_active: true },
  ];

  const messages = {
    saved: t("form.messages.saved"),
    deleted: t("form.messages.deleted"),
    restored: t("form.messages.restored"),
    signin: t("form.messages.signin"),
    slug_required: t("form.messages.slug_required"),
    invalid_locale: t("form.messages.invalid_locale"),
    invalid_slug: t("form.messages.invalid_slug"),
    reserved_slug: t("form.messages.reserved_slug"),
    slug_exists: t("form.messages.slug_exists"),
    html_required: t("form.messages.html_required"),
  };

  async function updateHtmlPageAction(
    _state: EditorState,
    formData: FormData,
  ): Promise<EditorState> {
    "use server";

    await requirePermission({
      code: PERMISSIONS.POSTS_WRITE,
      redirectUrl: "/admin/no-permission",
      locale,
    });

    const user = await getUserInfo();
    if (!user) {
      return {
        status: "error",
        message: messages.signin,
      };
    }

    const validation = await validateCustomHtmlPageInput({
      id: page.id,
      slug: String(formData.get("slug") || ""),
      locale: String(formData.get("targetLocale") || page.locale),
      html: String(formData.get("html") || ""),
    });

    if ("error" in validation) {
      return {
        status: "error",
        message: messages[validation.error as keyof typeof messages],
      };
    }

    await saveCustomHtmlPage({
      id: page.id,
      slug: validation.data.slug,
      locale: validation.data.locale,
      isActive: page.isActive,
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      html: validation.data.html,
      updatedBy: user.id,
    });

    return {
      status: "success",
      message: messages.saved,
      redirectUrl: `/admin/pages/${page.id}/edit`,
    };
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

  async function toggleActiveAction() {
    "use server";

    await requirePermission({
      code: PERMISSIONS.POSTS_WRITE,
      redirectUrl: "/admin/no-permission",
      locale,
    });

    await setCustomHtmlPageActiveState({
      id: page.id,
      isActive: !page.isActive,
    });

    redirect({
      href: `/admin/pages/${page.id}/edit`,
      locale,
    });
  }

  async function restoreRevisionAction(revisionId: string) {
    "use server";

    await requirePermission({
      code: PERMISSIONS.POSTS_WRITE,
      redirectUrl: "/admin/no-permission",
      locale,
    });

    const currentUser = await getUserInfo();
    if (!currentUser) {
      return redirect({
        href: `/admin/pages/${page.id}/edit`,
        locale,
      });
    }

    const revision = await getCustomHtmlPageRevisionById(revisionId);
    if (!revision || revision.pageId !== page.id) {
      redirect({
        href: `/admin/pages/${page.id}/edit`,
        locale,
      });
    }

    await saveCustomHtmlPage({
      id: page.id,
      slug: revision.slug,
      locale: revision.locale,
      title: revision.title || "",
      description: revision.description || "",
      html: revision.html,
      updatedBy: currentUser.id,
    });

    redirect({
      href: `/admin/pages/${page.id}/edit`,
      locale,
    });
  }

  const previewUrl = getCustomHtmlPageUrl({
    slug: page.slug,
    locale: page.locale,
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t("form.edit.title")}
          description={t("form.edit.description")}
        />
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <HtmlPageEditorForm
              action={updateHtmlPageAction}
              defaultLocale={defaultLocale}
              localeOptions={locales.map((value) => ({ value, label: value }))}
              initialValues={{
                slug: page.slug || "/",
                locale: page.locale,
                title: page.title || "",
                description: page.description || "",
                html: page.html,
              }}
              labels={{
                locale: t("form.labels.locale"),
                slug: t("form.labels.slug"),
                title: t("form.labels.title"),
                description: t("form.labels.description"),
                html: t("form.labels.html"),
                uploadHtml: t("form.labels.upload_html"),
                uploadHint: t("form.labels.upload_hint"),
                submit: t("form.labels.submit_edit"),
                back: t("form.labels.back"),
                preview: t("form.labels.preview"),
                pathPreview: t("form.labels.path_preview"),
              }}
              cancelUrl="/admin/pages"
              previewUrl={previewUrl}
              showMetadataFields={false}
            />
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("form.cards.details_title")}</CardTitle>
                  <CardDescription>
                    {t("form.cards.details_description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      {t("fields.slug")}
                    </div>
                    <div className="mt-1 break-all font-medium">
                      {getCustomHtmlPageDisplaySlug(page.slug)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      {t("fields.locale")}
                    </div>
                    <div className="mt-1 font-medium">{page.locale}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                      {t("form.cards.route")}
                    </div>
                    <div className="mt-1 break-all font-medium">{previewUrl}</div>
                  </div>
                  <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    {t("form.cards.updated_at")}
                  </div>
                  <div className="mt-1 font-medium">
                      {formatDateTime(page.updatedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                    {t("form.cards.active_state")}
                  </div>
                  <div className="mt-1 font-medium">
                    {page.isActive
                      ? t("form.cards.active_state_enabled")
                      : t("form.cards.active_state_disabled")}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("form.cards.publish_title")}</CardTitle>
                <CardDescription>
                  {t("form.cards.publish_description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={toggleActiveAction}>
                  <Button type="submit" variant="outline" size="sm">
                    {page.isActive
                      ? t("form.buttons.disable")
                      : t("form.buttons.enable")}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("form.buttons.delete")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={deleteAction}>
                    <Button type="submit" variant="outline" size="sm">
                      {t("form.buttons.delete")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t("form.cards.history_title")}</CardTitle>
              <CardDescription>
                {t("form.cards.history_description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {revisions.length > 0 ? (
                revisions.map((revision) => (
                  <div
                    key={revision.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1 text-sm">
                      <div className="font-medium">
                        {formatDateTime(revision.createdAt)}
                      </div>
                      <div className="text-muted-foreground break-all text-xs">
                        {getCustomHtmlPageDisplaySlug(revision.slug)}
                      </div>
                    </div>
                    <form action={restoreRevisionAction.bind(null, revision.id)}>
                      <Button type="submit" variant="outline" size="sm" className="w-full md:w-auto">
                        {t("form.buttons.restore_version")}
                      </Button>
                    </form>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">
                  {t("form.cards.history_empty")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
