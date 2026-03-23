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

  return (
    <div className="container mx-auto px-4 py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <RefundForm />
      </div>
    </div>
  );
}
