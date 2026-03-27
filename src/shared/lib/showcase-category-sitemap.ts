import { revalidatePath } from 'next/cache';

import { defaultLocale, locales } from '@/config/locale';

import {
  addUrlToSitemap,
  removeUrlFromSitemap,
} from '@/shared/lib/sitemap-updater';

type ShowcaseCategorySitemapRecord = {
  slug?: string | null;
  status?: string | null;
  type?: string | null;
};

const SHOWCASE_CATEGORY_TYPE = 'showcase_category';
const PUBLISHED_STATUS = 'published';

function getShowcaseCategoryPath(category?: ShowcaseCategorySitemapRecord | null) {
  if (
    !category ||
    category.type !== SHOWCASE_CATEGORY_TYPE ||
    category.status !== PUBLISHED_STATUS
  ) {
    return null;
  }

  const slug = String(category.slug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!slug) {
    return null;
  }

  return `/showcases/${slug}`;
}

function revalidateLocalizedPath(path: string) {
  revalidatePath(path);

  locales
    .filter((locale) => locale !== defaultLocale)
    .forEach((locale) => revalidatePath(`/${locale}${path}`));
}

export async function syncShowcaseCategorySitemapEntry({
  previousCategory,
  nextCategory,
}: {
  previousCategory?: ShowcaseCategorySitemapRecord | null;
  nextCategory?: ShowcaseCategorySitemapRecord | null;
}) {
  const touchesShowcaseCategory =
    previousCategory?.type === SHOWCASE_CATEGORY_TYPE ||
    nextCategory?.type === SHOWCASE_CATEGORY_TYPE;

  if (!touchesShowcaseCategory) {
    return;
  }

  const previousPath = getShowcaseCategoryPath(previousCategory);
  const nextPath = getShowcaseCategoryPath(nextCategory);

  if (previousPath && previousPath !== nextPath) {
    await removeUrlFromSitemap(previousPath);
  }

  if (nextPath) {
    await addUrlToSitemap(nextPath, '0.80');
  }

  revalidateLocalizedPath('/showcases');

  if (previousPath) {
    revalidateLocalizedPath(previousPath);
  }

  if (nextPath && nextPath !== previousPath) {
    revalidateLocalizedPath(nextPath);
  }
}
