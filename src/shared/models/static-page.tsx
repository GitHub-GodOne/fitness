import { readFile } from "fs/promises";
import { ReactNode } from "react";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getMDXComponents } from "@/mdx-components";
import { defaultLocale, locales } from "@/config/locale";
import { pageOverride } from "@/config/db/schema";
import { pagesSource } from "@/core/docs/source";
import { generateTOC } from "@/core/docs/toc";
import { db } from "@/core/db";
import { getUuid } from "@/shared/lib/hash";
import { Post as BlogPostType } from "@/shared/types/blocks/blog";
import { createRelativeLink } from "fumadocs-ui/mdx";

import { MDXContent } from "../blocks/common/mdx-content";
import { getPostDate } from "./post";

export type PageOverride = typeof pageOverride.$inferSelect;
export type NewPageOverride = typeof pageOverride.$inferInsert;

export type EditableStaticPage = {
  slug: string;
  locale: string;
  url: string;
  title: string;
  description: string;
  sourceContent: string;
  absolutePath: string;
  override: PageOverride | null;
};

function normalizeStaticPageSlug(slug: string) {
  return slug
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function stripFrontmatter(content: string) {
  if (!content.startsWith("---")) {
    return content.trim();
  }

  return content.replace(/^---\s*\n[\s\S]*?\n---\s*/, "").trim();
}

function normalizeOverrideValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized || null;
}

function toLocalizedPagePath({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  return locale === defaultLocale ? `/${slug}` : `/${locale}/${slug}`;
}

function revalidateStaticPagePaths({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  revalidatePath(toLocalizedPagePath({ slug, locale }));

  if (locale === defaultLocale) {
    revalidatePath(`/${locale}/${slug}`);
  }

  revalidatePath("/admin/pages");
  revalidatePath(`/${locale}/admin/pages`);
  revalidatePath("/admin/pages/edit");
  revalidatePath(`/${locale}/admin/pages/edit`);
}

async function readStaticPageSource(absolutePath: string) {
  try {
    const raw = await readFile(absolutePath, "utf8");
    return stripFrontmatter(raw);
  } catch (error) {
    console.log("read static page source failed:", error);
    return "";
  }
}

export async function findPageOverride({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  const [result] = await db()
    .select()
    .from(pageOverride)
    .where(and(eq(pageOverride.slug, slug), eq(pageOverride.locale, locale)))
    .limit(1);

  return result ?? null;
}

export async function getPageOverrides() {
  return await db()
    .select()
    .from(pageOverride)
    .orderBy(asc(pageOverride.locale), asc(pageOverride.slug));
}

export async function savePageOverride({
  slug,
  locale,
  title,
  description,
  content,
  updatedBy,
}: {
  slug: string;
  locale: string;
  title?: string | null;
  description?: string | null;
  content?: string | null;
  updatedBy?: string | null;
}) {
  const [result] = await db()
    .insert(pageOverride)
    .values({
      id: getUuid(),
      slug,
      locale,
      title: title ?? null,
      description: description ?? null,
      content: content ?? null,
      updatedBy: updatedBy ?? null,
    })
    .onConflictDoUpdate({
      target: [pageOverride.locale, pageOverride.slug],
      set: {
        title: title ?? null,
        description: description ?? null,
        content: content ?? null,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  revalidateStaticPagePaths({ slug, locale });

  return result ?? null;
}

export async function deletePageOverride({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}) {
  const [result] = await db()
    .delete(pageOverride)
    .where(and(eq(pageOverride.slug, slug), eq(pageOverride.locale, locale)))
    .returning();

  revalidateStaticPagePaths({ slug, locale });

  return result ?? null;
}

export async function getEditableStaticPage({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<EditableStaticPage | null> {
  const localPage = await pagesSource.getPage(
    normalizeStaticPageSlug(slug),
    locale,
  );
  if (!localPage) {
    return null;
  }

  const override = await findPageOverride({ slug, locale });
  const sourceContent = await readStaticPageSource(localPage.absolutePath);

  return {
    slug,
    locale,
    url: localPage.url,
    title: localPage.data.title || "",
    description: localPage.data.description || "",
    sourceContent,
    absolutePath: localPage.absolutePath,
    override,
  };
}

export async function getEditableStaticPages() {
  const overrides = await getPageOverrides();
  const overrideMap = new Map(
    overrides.map((item) => [`${item.locale}:${item.slug}`, item]),
  );

  const rows = locales.flatMap((locale) =>
    pagesSource.getPages(locale).map((page) => {
      const slug = page.slugs.join("/");

      return {
        slug,
        locale,
        url: page.url,
        title: page.data.title || "",
        description: page.data.description || "",
        absolutePath: page.absolutePath,
        override: overrideMap.get(`${locale}:${slug}`) ?? null,
      };
    }),
  );

  return rows.sort((a, b) => {
    const slugCompare = a.slug.localeCompare(b.slug);
    if (slugCompare !== 0) {
      return slugCompare;
    }

    return a.locale.localeCompare(b.locale);
  });
}

export async function upsertStaticPageOverrideFromEditor({
  slug,
  locale,
  baseTitle,
  baseDescription,
  baseContent,
  title,
  description,
  content,
  updatedBy,
}: {
  slug: string;
  locale: string;
  baseTitle: string;
  baseDescription: string;
  baseContent: string;
  title: string;
  description: string;
  content: string;
  updatedBy?: string | null;
}) {
  const normalizedBaseTitle = normalizeOverrideValue(baseTitle);
  const normalizedBaseDescription = normalizeOverrideValue(baseDescription);
  const normalizedBaseContent = normalizeOverrideValue(baseContent);
  const normalizedTitle = normalizeOverrideValue(title);
  const normalizedDescription = normalizeOverrideValue(description);
  const normalizedContent = normalizeOverrideValue(content);

  const nextTitle =
    normalizedTitle && normalizedTitle !== normalizedBaseTitle
      ? normalizedTitle
      : null;
  const nextDescription =
    normalizedDescription && normalizedDescription !== normalizedBaseDescription
      ? normalizedDescription
      : null;
  const nextContent =
    normalizedContent && normalizedContent !== normalizedBaseContent
      ? normalizedContent
      : null;

  if (!nextTitle && !nextDescription && !nextContent) {
    const deleted = await deletePageOverride({ slug, locale });
    return {
      action: "reset" as const,
      record: deleted,
    };
  }

  const saved = await savePageOverride({
    slug,
    locale,
    title: nextTitle,
    description: nextDescription,
    content: nextContent,
    updatedBy,
  });

  return {
    action: "saved" as const,
    record: saved,
  };
}

export async function getLocalPage({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<BlogPostType | null> {
  const localPage = await pagesSource.getPage(
    normalizeStaticPageSlug(slug),
    locale,
  );
  if (!localPage) {
    return null;
  }

  const override = await findPageOverride({ slug, locale });
  const frontmatter = localPage.data as any;

  let body: ReactNode;
  let toc = localPage.data.toc;

  if (override?.content) {
    body = <MDXContent source={override.content} />;
    toc = generateTOC(override.content);
  } else {
    const LocalMDXContent = localPage.data.body;
    body = (
      <LocalMDXContent
        components={getMDXComponents({
          a: createRelativeLink(pagesSource, localPage),
        })}
      />
    );
  }

  return {
    id: override?.id || localPage.path,
    slug,
    title: override?.title || localPage.data.title || "",
    description: override?.description || localPage.data.description || "",
    content: override?.content || "",
    body,
    toc,
    created_at: frontmatter.created_at
      ? getPostDate({
          created_at: frontmatter.created_at,
          locale,
        })
      : "",
    author_name: frontmatter.author_name || "",
    author_image: frontmatter.author_image || "",
    author_role: "",
    url: localPage.url,
  };
}
