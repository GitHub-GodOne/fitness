import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

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

  const t = await getTranslations({ locale, namespace: 'pages.showcases.seo' });
  const seoParagraphs = t.raw('paragraphs') as string[];

  return (
    <>
      <ShowcasesPageContent locale={locale} searchQuery={q} />
      <section className="container pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-4xl rounded-[24px] border border-border/70 bg-card/70 px-5 py-6 shadow-sm sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('title')}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            <p>{t('homepageSearchParagraph')}</p>
            <p>{t('homepageSubmissionParagraph')}</p>
            {seoParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
