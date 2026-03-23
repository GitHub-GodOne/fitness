import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import {
  getTaxonomies,
  TaxonomyStatus,
  TaxonomyType,
} from '@/shared/models/taxonomy';

import { ShowcasesPageContent } from '../showcases-page-content';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const categorySlug = Array.isArray(slug) ? slug.join('/') : slug;
  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: `showcases/${categorySlug}`,
    locale,
    canonicalPath: `/showcases/${categorySlug}`,
  });

  if (customHtmlMetadata) {
    return customHtmlMetadata;
  }

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });

  const category = categories.find((item) => item.slug === categorySlug);
  const title = category?.title || 'Showcases';
  const description =
    category?.description || 'Browse the published videos in this category.';
  const canonical = `${envConfigs.app_url}${
    locale === defaultLocale ? '' : `/${locale}`
  }/showcases/${categorySlug}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      locale,
      url: canonical,
      title,
      description,
    },
  };
}

export default async function ShowcaseCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const categorySlug = Array.isArray(slug) ? slug.join('/') : slug;
  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: `showcases/${categorySlug}`,
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  return <ShowcasesPageContent locale={locale} categorySlug={categorySlug} />;
}
