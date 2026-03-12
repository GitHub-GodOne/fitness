import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { MediaAssetLibrary } from '@/shared/blocks/admin/media-asset-library';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { getMediaAssets } from '@/shared/models/media-asset';
import type { Crumb } from '@/shared/types/blocks/common';

export default async function MediaAssetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isZh = locale === 'zh';
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: isZh ? '资源库' : 'Media Assets', is_active: true },
  ];

  const assets = await getMediaAssets({ limit: 120 });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={isZh ? 'R2 资源库' : 'R2 Asset Library'} />
        <MediaAssetLibrary initialAssets={assets} locale={locale} />
      </Main>
    </>
  );
}
