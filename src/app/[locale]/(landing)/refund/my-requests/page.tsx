import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/core/i18n/navigation';

import { getUserInfo } from '@/shared/models/user';
import { MyRefundRequests } from '@/shared/blocks/common/my-refund-requests';

export default async function MyRefundRequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUserInfo();
  if (!user) {
    redirect({ href: '/refund', locale });
  }

  const t = await getTranslations('refund');

  return (
    <div className="container mx-auto px-4 py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-2xl font-bold sm:text-3xl">{t('my_requests.title')}</h1>
        <MyRefundRequests />
      </div>
    </div>
  );
}
