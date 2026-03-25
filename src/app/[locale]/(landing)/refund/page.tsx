import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getMetadata } from '@/shared/lib/seo';
import { RefundForm } from '@/shared/blocks/common/refund-form';

const getDefaultMetadata = getMetadata({
  metadataKey: 'refund.metadata',
  canonicalUrl: '/refund',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: 'refund',
    locale,
    canonicalPath: '/refund',
  });

  return customHtmlMetadata ?? getDefaultMetadata({ params });
}

export default async function RefundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: 'refund',
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  const t = await getTranslations({ locale, namespace: 'refund' });
  const seoParagraphs = t.raw('seo.paragraphs') as string[];

  return (
    <div className="container mx-auto px-4 py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <RefundForm />
      </div>
      <section className="mx-auto mt-10 max-w-3xl rounded-[24px] border border-border/70 bg-card/70 px-5 py-6 shadow-sm sm:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('seo.title')}
        </h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {seoParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
