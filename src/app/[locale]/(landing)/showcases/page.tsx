import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getMetadata } from '@/shared/lib/seo';

import { ShowcasesPageContent } from './showcases-page-content';

export const revalidate = 3600;

const getDefaultMetadata = getMetadata({
  metadataKey: 'pages.showcases.metadata',
  canonicalUrl: '/showcases',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: 'showcases',
    locale,
    canonicalPath: '/showcases',
  });

  return customHtmlMetadata ?? getDefaultMetadata({ params });
}

export default async function ShowcasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { locale } = await params;
  const { category, q } = await searchParams;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: 'showcases',
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  if (category) {
    redirect(q ? `/showcases/${category}?q=${encodeURIComponent(q)}` : `/showcases/${category}`);
  }

  return <ShowcasesPageContent locale={locale} searchQuery={q} />;
}
