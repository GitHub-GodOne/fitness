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
  metadataKey: 'pages.comments.metadata',
  canonicalUrl: '/comments',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: 'comments',
    locale,
    canonicalPath: '/comments',
  });

  return customHtmlMetadata ?? getDefaultMetadata({ params });
}

export default async function CommentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: 'comments',
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  const t = await getTranslations('pages.comments');

  // build page sections
  const page: DynamicPage = t.raw('page');

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
