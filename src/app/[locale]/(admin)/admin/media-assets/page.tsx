import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { MediaAssetLibrary } from '@/shared/blocks/admin/media-asset-library';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import type { Crumb } from '@/shared/types/blocks/common';

export default async function MediaAssetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.media-assets.page');

  const crumbs: Crumb[] = [
    { title: t('crumbs.admin'), url: '/admin' },
    { title: t('crumbs.mediaAssets'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} />
        <MediaAssetLibrary locale={locale} />
      </Main>
    </>
  );
}
