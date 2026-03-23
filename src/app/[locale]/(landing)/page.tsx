import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

const getDefaultMetadata = getMetadata({
  canonicalUrl: '/',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: '',
    locale,
    canonicalPath: '/',
  });

  return customHtmlMetadata ?? getDefaultMetadata({ params });
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: '',
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  const t = await getTranslations('pages.index');

  // get page data
  const page: DynamicPage = t.raw('page');

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
