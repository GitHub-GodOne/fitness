import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getThemePage } from "@/core/theme";
import { CustomHtmlRenderer } from "@/shared/blocks/common/custom-html-renderer";
import { buildSeoTitle, getLocaleAlternates } from "@/shared/lib/seo";
import { getCustomHtmlPageBySlug } from "@/shared/models/custom-html-page";
import { getLocalPage } from "@/shared/models/static-page";

export const revalidate = 3600;

// Common bot/scanner path prefixes to reject early
const BLOCKED_PREFIXES = [
  "wp-",
  "wordpress",
  ".env",
  "admin",
  "login",
  "assets",
  "cgi-bin",
  "vendor",
  "node_modules",
  ".git",
  "xmlrpc",
  "phpmyadmin",
  "config",
  ".well-known",
  "actuator",
];

// dynamic page metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  // metadata values
  let title = "";
  let description = "";
  // 1. try to get static page metadata from
  // content/pages/**/*.mdx

  // static page slug
  const staticPageSlug =
    typeof slug === "string" ? slug : (slug as string[]).join("/") || "";

  // filter invalid slug
  if (staticPageSlug.includes(".")) {
    return;
  }

  // block bot/scanner paths early
  const firstSegment = staticPageSlug.split("/")[0].toLowerCase();
  if (BLOCKED_PREFIXES.some((p) => firstSegment.startsWith(p))) {
    return;
  }

  const alternates = getLocaleAlternates(`/${staticPageSlug}`, locale);

  const customHtmlPage = await getCustomHtmlPageBySlug({
    slug: staticPageSlug,
    locale,
  });

  if (customHtmlPage?.title || customHtmlPage?.description) {
    return {
      title: customHtmlPage.title
        ? buildSeoTitle(customHtmlPage.title)
        : undefined,
      description: customHtmlPage.description || undefined,
      alternates,
    };
  }

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page metadata
  if (staticPage) {
    title = staticPage.title || "";
    description = staticPage.description || "";

    return {
      title: buildSeoTitle(title),
      description,
      alternates,
    };
  }

  // 2. static page not found, try to get dynamic page metadata from
  // src/config/locale/messages/{locale}/pages/**/*.json

  // dynamic page slug
  const dynamicPageSlug =
    typeof slug === "string" ? slug : (slug as string[]).join(".") || "";

  const messageKey = `pages.${dynamicPageSlug}`;

  try {
    const t = await getTranslations({ locale, namespace: messageKey });

    // return dynamic page metadata
    if (t.has("metadata")) {
      title = t.raw("metadata.title");
      description = t.raw("metadata.description");

      return {
        title: buildSeoTitle(title),
        description,
        alternates,
      };
    }
  } catch {
    // ignore error if translation not found
  }

  // 3. return common metadata
  const tc = await getTranslations("common.metadata");

  title = tc("title");
  description = tc("description");

  return {
    title: buildSeoTitle(title),
    description,
    alternates,
  };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // 1. try to get static page from
  // content/pages/**/*.mdx

  // static page slug
  const staticPageSlug =
    typeof slug === "string" ? slug : (slug as string[]).join("/") || "";

  // filter invalid slug
  if (staticPageSlug.includes(".")) {
    return notFound();
  }

  // block bot/scanner paths early
  const firstSegment = staticPageSlug.split("/")[0].toLowerCase();
  if (BLOCKED_PREFIXES.some((p) => firstSegment.startsWith(p))) {
    return notFound();
  }

  const customHtmlPage = await getCustomHtmlPageBySlug({
    slug: staticPageSlug,
    locale,
  });

  if (customHtmlPage) {
    return <CustomHtmlRenderer className="min-w-0" html={customHtmlPage.html} />;
  }

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page
  if (staticPage) {
    const Page = await getThemePage("static-page");

    return <Page locale={locale} post={staticPage} />;
  }

  // 2. static page not found
  // try to get dynamic page content from
  // src/config/locale/messages/{locale}/pages/**/*.json

  // dynamic page slug
  const dynamicPageSlug =
    typeof slug === "string" ? slug : (slug as string[]).join(".") || "";

  const messageKey = `pages.${dynamicPageSlug}`;

  try {
    const t = await getTranslations({ locale, namespace: messageKey });

    // return dynamic page
    if (t.has("page")) {
      const Page = await getThemePage("dynamic-page");
      return <Page locale={locale} page={t.raw("page")} />;
    }
  } catch (error) {
    // ignore error if translation not found
    return notFound();
  }

  // 3. page not found
  return notFound();
}
