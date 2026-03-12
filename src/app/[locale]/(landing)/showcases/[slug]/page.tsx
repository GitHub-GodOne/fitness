import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { getTaxonomies, TaxonomyStatus, TaxonomyType } from '@/shared/models/taxonomy';

import { ShowcasesPageContent } from '../showcases-page-content';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });

  const category = categories.find((item) => item.slug === slug);
  const title = category?.title || 'Showcases';
  const description =
    category?.description || 'Browse the published videos in this category.';
  const canonical = `${envConfigs.app_url}${
    locale === defaultLocale ? '' : `/${locale}`
  }/showcases/${slug}`;

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
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return <ShowcasesPageContent locale={locale} categorySlug={slug} />;
}
