import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';

import { ShowcasesPageContent } from './showcases-page-content';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.showcases.metadata',
  canonicalUrl: '/showcases',
});

export default async function ShowcasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  setRequestLocale(locale);

  if (category) {
    redirect(`/showcases/${category}`);
  }

  return <ShowcasesPageContent locale={locale} />;
}
