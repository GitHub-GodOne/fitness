import type { Metadata } from "next";

import { defaultLocale } from "@/config/locale";
import { CustomHtmlRenderer } from "@/shared/blocks/common/custom-html-renderer";
import { buildAbsoluteSiteUrl } from "@/shared/lib/site-url";
import { getCustomHtmlPageBySlug } from "@/shared/models/custom-html-page";

export async function renderCustomHtmlPageOverride({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  const page = await getCustomHtmlPageBySlug({ slug, locale });

  if (!page) {
    return null;
  }

  return <CustomHtmlRenderer className="min-w-0" html={page.html} />;
}

export async function getCustomHtmlPageOverrideMetadata({
  slug,
  locale,
  canonicalPath,
}: {
  slug: string;
  locale: string;
  canonicalPath?: string;
}): Promise<Metadata | null> {
  const page = await getCustomHtmlPageBySlug({ slug, locale });

  if (!page || (!page.title && !page.description)) {
    return null;
  }

  const normalizedCanonicalPath = canonicalPath || (slug ? `/${slug}` : "/");
  const canonical = normalizedCanonicalPath.startsWith("http")
    ? normalizedCanonicalPath
    : buildAbsoluteSiteUrl(
        `${locale === defaultLocale ? "" : `/${locale}`}${
          normalizedCanonicalPath === "/" ? "" : normalizedCanonicalPath
        }` || "/"
      );

  return {
    title: page.title || undefined,
    description: page.description || undefined,
    alternates: {
      canonical,
    },
  };
}
