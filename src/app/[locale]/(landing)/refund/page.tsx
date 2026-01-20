import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import { RefundForm } from '@/shared/blocks/common/refund-form';

export const generateMetadata = getMetadata({
  metadataKey: 'refund.metadata',
  canonicalUrl: '/refund',
});

export default async function RefundPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto px-4 py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <RefundForm />
      </div>
    </div>
  );
}
