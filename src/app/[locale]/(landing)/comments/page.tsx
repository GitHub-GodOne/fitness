import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getMetadata } from '@/shared/lib/seo';
import { getCommentsCount } from '@/shared/models/comment';
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
  const seoParagraphs = t.raw('seo.paragraphs') as string[];
  const totalComments = await getCommentsCount({
    visibility: 'public',
  });

  // build page sections
  const page: DynamicPage = t.raw('page');

  // load page component
  const Page = await getThemePage('dynamic-page');

  return (
    <>
      <Page locale={locale} page={page} />
      <section className="container pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-3xl rounded-[24px] border border-border/70 bg-card/70 px-5 py-6 shadow-sm sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('seo.title')}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            <p>{t('seo.countParagraph', { count: totalComments })}</p>
            {seoParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
