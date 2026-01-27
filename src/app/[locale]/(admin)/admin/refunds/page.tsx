import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { RefundManagement } from '@/shared/blocks/admin/refund-management';
import { Crumb, Tab } from '@/shared/types/blocks/common';

export default async function RefundsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: number;
    pageSize?: number;
    status?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check if user has permission to read refunds
  await requirePermission({
    code: PERMISSIONS.ADMIN_REFUND_VIEW,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.refunds');

  const { page: pageNum, pageSize, status } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.refunds'), is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: 'all',
      title: t('list.tabs.all'),
      url: '/admin/refunds',
      is_active: !status || status === 'all',
    },
    {
      name: 'pending',
      title: t('list.tabs.pending'),
      url: '/admin/refunds?status=pending',
      is_active: status === 'pending',
    },
    {
      name: 'completed',
      title: t('list.tabs.completed'),
      url: '/admin/refunds?status=completed',
      is_active: status === 'completed',
    },
    {
      name: 'rejected',
      title: t('list.tabs.rejected'),
      url: '/admin/refunds?status=rejected',
      is_active: status === 'rejected',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} tabs={tabs} />
        <RefundManagement status={status} page={page} limit={limit} />
      </Main>
    </>
  );
}
