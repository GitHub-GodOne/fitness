import { and, asc, desc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { defaultLocale, locales } from "@/config/locale";
import { customHtmlPage, customHtmlPageRevision } from "@/config/db/schema";
import { db } from "@/core/db";
import { getUuid } from "@/shared/lib/hash";
import {
  addUrlToSitemap,
  removeUrlFromSitemap,
} from "@/shared/lib/sitemap-updater";

export type CustomHtmlPage = typeof customHtmlPage.$inferSelect;
export type CustomHtmlPageRevision = typeof customHtmlPageRevision.$inferSelect;

const RESERVED_LANDING_SEGMENTS = new Set([
  "admin",
  "api",
  "assets",
  "cgi-bin",
  "config",
  "docs",
  "login",
  "node_modules",
  "phpmyadmin",
  "settings",
  "vendor",
  "wordpress",
  "xmlrpc",
]);

const RESERVED_LANDING_PREFIX_MATCHES = ["wp-"];

const SLUG_SEGMENT_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

function buildLocalizedPath({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  if (!slug) {
    return locale === defaultLocale ? "/" : `/${locale}`;
  }

  return locale === defaultLocale ? `/${slug}` : `/${locale}/${slug}`;
}

function revalidateCustomHtmlPagePaths({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  revalidatePath(buildLocalizedPath({ slug, locale }));

  if (locale === defaultLocale) {
    revalidatePath(`/${locale}/${slug}`);
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/${locale}/admin/pages`);
  revalidatePath("/admin/pages/add");
  revalidatePath(`/${locale}/admin/pages/add`);
}

export function normalizeCustomHtmlPageSlug(input: string) {
  return input
    .trim()
    .replace(/^[a-z]+:\/\/[^/]+/i, "")
    .replace(/[?#].*$/, "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean)
    .join("/");
}

export function extractRenderableHtml(html: string) {
  const normalized = html.trim();
  const bodyMatch = normalized.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : normalized;

  return content
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(html|head|body)[^>]*>/gi, "")
    .trim();
}

function isReservedSlug(slug: string) {
  const firstSegment = slug.split("/")[0]?.toLowerCase() || "";
  if (!firstSegment) {
    return false;
  }

  if (RESERVED_LANDING_SEGMENTS.has(firstSegment)) {
    return true;
  }

  return RESERVED_LANDING_PREFIX_MATCHES.some((prefix) =>
    firstSegment.startsWith(prefix),
  );
}

export async function getCustomHtmlPages() {
  return await db()
    .select()
    .from(customHtmlPage)
    .orderBy(asc(customHtmlPage.slug), asc(customHtmlPage.locale));
}

export async function getCustomHtmlPageById(id: string) {
  const [result] = await db()
    .select()
    .from(customHtmlPage)
    .where(eq(customHtmlPage.id, id))
    .limit(1);

  return result ?? null;
}

export async function getCustomHtmlPageBySlug({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  const [result] = await db()
    .select()
    .from(customHtmlPage)
    .where(
      and(
        eq(customHtmlPage.slug, slug),
        eq(customHtmlPage.locale, locale),
      ),
    )
    .limit(1);

  return result ?? null;
}

export async function getCustomHtmlPageRevisions(pageId: string, limit = 20) {
  return await db()
    .select()
    .from(customHtmlPageRevision)
    .where(eq(customHtmlPageRevision.pageId, pageId))
    .orderBy(desc(customHtmlPageRevision.createdAt))
    .limit(limit);
}

export async function getCustomHtmlPageRevisionById(id: string) {
  const [result] = await db()
    .select()
    .from(customHtmlPageRevision)
    .where(eq(customHtmlPageRevision.id, id))
    .limit(1);

  return result ?? null;
}

export async function validateCustomHtmlPageInput({
  id,
  slug,
  locale,
  html,
}: {
  id?: string;
  slug: string;
  locale: string;
  html: string;
}) {
  const normalizedSlug = normalizeCustomHtmlPageSlug(slug);
  const rawSlug = slug.trim();
  const normalizedLocale = locale.trim();
  const normalizedHtml = html.trim();
  const isRootPath = !normalizedSlug && rawSlug === "/";

  if (!normalizedSlug && !isRootPath) {
    return { error: "slug_required" as const };
  }

  if (!locales.includes(normalizedLocale)) {
    return { error: "invalid_locale" as const };
  }

  if (normalizedSlug.includes(".")) {
    return { error: "invalid_slug" as const };
  }

  const segments = normalizedSlug ? normalizedSlug.split("/") : [];
  if (segments.some((segment) => !SLUG_SEGMENT_PATTERN.test(segment))) {
    return { error: "invalid_slug" as const };
  }

  if (normalizedSlug && isReservedSlug(normalizedSlug)) {
    return { error: "reserved_slug" as const };
  }

  if (!normalizedHtml) {
    return { error: "html_required" as const };
  }

  const existing = await db()
    .select()
    .from(customHtmlPage)
    .where(
      and(
        eq(customHtmlPage.slug, normalizedSlug),
        eq(customHtmlPage.locale, normalizedLocale),
        id ? ne(customHtmlPage.id, id) : undefined,
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return { error: "slug_exists" as const };
  }

  return {
    data: {
      slug: normalizedSlug,
      locale: normalizedLocale,
      html: normalizedHtml,
    },
  };
}

export async function saveCustomHtmlPage({
  id,
  slug,
  locale,
  title,
  description,
  html,
  updatedBy,
}: {
  id?: string;
  slug: string;
  locale: string;
  title?: string | null;
  description?: string | null;
  html: string;
  updatedBy?: string | null;
}) {
  const nextId = id ?? getUuid();
  const normalizedTitle = title?.trim() || null;
  const normalizedDescription = description?.trim() || null;
  const previousRecord = id ? await getCustomHtmlPageById(id) : null;

  const [result] = await db()
    .insert(customHtmlPage)
    .values({
      id: nextId,
      slug,
      locale,
      title: normalizedTitle,
      description: normalizedDescription,
      html,
      updatedBy: updatedBy ?? null,
    })
    .onConflictDoUpdate({
      target: customHtmlPage.id,
      set: {
        slug,
        locale,
        title: normalizedTitle,
        description: normalizedDescription,
        html,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (result) {
    await db().insert(customHtmlPageRevision).values({
      id: getUuid(),
      pageId: result.id,
      slug: result.slug,
      locale: result.locale,
      title: result.title,
      description: result.description,
      html: result.html,
      createdBy: updatedBy ?? null,
    });
  }

  revalidateCustomHtmlPagePaths({ slug, locale });
  await addUrlToSitemap(buildLocalizedPath({ slug, locale }));

  if (
    previousRecord &&
    (previousRecord.slug !== slug || previousRecord.locale !== locale)
  ) {
    await removeUrlFromSitemap(
      buildLocalizedPath({
        slug: previousRecord.slug,
        locale: previousRecord.locale,
      })
    );
    revalidateCustomHtmlPagePaths({
      slug: previousRecord.slug,
      locale: previousRecord.locale,
    });
  }

  return result ?? null;
}

export async function deleteCustomHtmlPageById(id: string) {
  const [result] = await db()
    .delete(customHtmlPage)
    .where(eq(customHtmlPage.id, id))
    .returning();

  if (result) {
    await removeUrlFromSitemap(
      buildLocalizedPath({
        slug: result.slug,
        locale: result.locale,
      })
    );
    revalidateCustomHtmlPagePaths({
      slug: result.slug,
      locale: result.locale,
    });
    revalidatePath(`/admin/pages/${id}/edit`);
  }

  return result ?? null;
}

export function getCustomHtmlPageUrl({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  return buildLocalizedPath({ slug, locale });
}

export function getCustomHtmlPageDisplaySlug(slug: string) {
  return slug || "/";
}
