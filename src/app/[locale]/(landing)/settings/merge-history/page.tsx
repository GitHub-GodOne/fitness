import { getTranslations, setRequestLocale } from 'next-intl/server';

import { MergeHistoryTable } from '@/shared/blocks/panel/merge-history-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings.merge-history.metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function MergeHistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('settings.merge-history.page');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <MergeHistoryTable />
    </div>
  );
}
