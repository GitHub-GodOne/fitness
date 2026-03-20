import { getTranslations, setRequestLocale } from "next-intl/server";

import { defaultLocale, locales } from "@/config/locale";
import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { HtmlPageEditorForm } from "@/shared/blocks/admin/html-page-editor-form";
import {
  saveCustomHtmlPage,
  validateCustomHtmlPageInput,
} from "@/shared/models/custom-html-page";
import { getUserInfo } from "@/shared/models/user";
import { Crumb } from "@/shared/types/blocks/common";

type EditorState = {
  status?: "error" | "success";
  message?: string;
  redirectUrl?: string;
};

export default async function AddHtmlPageAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.POSTS_WRITE,
    redirectUrl: "/admin/no-permission",
    locale,
  });

  const t = await getTranslations("admin.pages");
  const crumbs: Crumb[] = [
    { title: t("form.add.crumbs.admin"), url: "/admin" },
    { title: t("form.add.crumbs.pages"), url: "/admin/pages" },
    { title: t("form.add.crumbs.add"), is_active: true },
  ];

  const messages = {
    saved: t("form.messages.saved"),
    signin: t("form.messages.signin"),
    slug_required: t("form.messages.slug_required"),
    invalid_locale: t("form.messages.invalid_locale"),
    invalid_slug: t("form.messages.invalid_slug"),
    reserved_slug: t("form.messages.reserved_slug"),
    slug_exists: t("form.messages.slug_exists"),
    html_required: t("form.messages.html_required"),
  };

  async function createHtmlPageAction(
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
      slug: String(formData.get("slug") || ""),
      locale: String(formData.get("targetLocale") || locale),
      html: String(formData.get("html") || ""),
    });

    if ("error" in validation) {
      return {
        status: "error",
        message: messages[validation.error as keyof typeof messages],
      };
    }

    const saved = await saveCustomHtmlPage({
      slug: validation.data.slug,
      locale: validation.data.locale,
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      html: validation.data.html,
      updatedBy: user.id,
    });

    return {
      status: "success",
      message: messages.saved,
      redirectUrl: `/admin/pages/${saved?.id}/edit`,
    };
  }

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t("form.add.title")}
          description={t("form.add.description")}
        />
        <HtmlPageEditorForm
          action={createHtmlPageAction}
          defaultLocale={defaultLocale}
          localeOptions={locales.map((value) => ({ value, label: value }))}
          initialValues={{
            slug: "",
            locale,
            title: "",
            description: "",
            html: "",
          }}
          labels={{
            locale: t("form.labels.locale"),
            slug: t("form.labels.slug"),
            title: t("form.labels.title"),
            description: t("form.labels.description"),
            html: t("form.labels.html"),
            uploadHtml: t("form.labels.upload_html"),
            uploadHint: t("form.labels.upload_hint"),
            submit: t("form.labels.submit_add"),
            back: t("form.labels.back"),
            preview: t("form.labels.preview"),
            pathPreview: t("form.labels.path_preview"),
          }}
          cancelUrl="/admin/pages"
          showMetadataFields={false}
        />
      </Main>
    </>
  );
}
