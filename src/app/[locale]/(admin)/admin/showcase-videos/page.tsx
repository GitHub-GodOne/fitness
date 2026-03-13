import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getShowcaseVideos,
  getShowcaseVideosCount,
  ShowcaseVideoStatus,
} from '@/shared/models/showcase-video';
import { getTaxonomies, TaxonomyType } from '@/shared/models/taxonomy';
import type { ShowcaseVideo } from '@/shared/models/showcase-video';
import type { Button, Crumb, Tab } from '@/shared/types/blocks/common';
import type { Table } from '@/shared/types/blocks/table';

export default async function ShowcaseVideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number; status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.showcase-videos');

  const { page: pageNum, pageSize, status } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;
  const activeStatus =
    status && status !== 'all' ? status : undefined;

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.videos'), is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: 'all',
      title: t('list.tabs.all'),
      url: '/admin/showcase-videos',
      is_active: !activeStatus,
    },
    {
      name: ShowcaseVideoStatus.PENDING,
      title: t('list.tabs.pending'),
      url: `/admin/showcase-videos?status=${ShowcaseVideoStatus.PENDING}`,
      is_active: activeStatus === ShowcaseVideoStatus.PENDING,
    },
    {
      name: ShowcaseVideoStatus.PUBLISHED,
      title: t('list.tabs.published'),
      url: `/admin/showcase-videos?status=${ShowcaseVideoStatus.PUBLISHED}`,
      is_active: activeStatus === ShowcaseVideoStatus.PUBLISHED,
    },
    {
      name: ShowcaseVideoStatus.REJECTED,
      title: t('list.tabs.rejected'),
      url: `/admin/showcase-videos?status=${ShowcaseVideoStatus.REJECTED}`,
      is_active: activeStatus === ShowcaseVideoStatus.REJECTED,
    },
  ];

  const total = await getShowcaseVideosCount({
    status: activeStatus,
  });
  const videos = await getShowcaseVideos({
    status: activeStatus,
    page,
    limit,
    getUser: true,
  });

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    limit: 200,
  });
  const categoryMap = new Map(categories.map((item) => [item.id, item.title]));
  const data = videos.map((video: ShowcaseVideo) => ({
    ...video,
    categoryTitle: video.categoryId ? categoryMap.get(video.categoryId) || '-' : '-',
    featuredLabel: video.featured ? t('featuredOptions.featured') : t('featuredOptions.normal'),
  }));

  const table: Table = {
    columns: [
      { name: 'title', title: t('fields.title') },
      { name: 'categoryTitle', title: t('fields.category') },
      { name: 'user', title: t('fields.user'), type: 'user' },
      { name: 'status', title: t('fields.status'), type: 'label' },
      { name: 'featuredLabel', title: t('fields.featured'), type: 'label' },
      { name: 'createdAt', title: t('fields.createdAt'), type: 'time' },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: ShowcaseVideo) => [
          {
            title: t('list.buttons.edit'),
            icon: 'RiEditLine',
            url: `/admin/showcase-videos/${item.id}/edit`,
          },
        ],
      },
    ],
    data,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const actions: Button[] = [];
  actions.push({
    id: 'add',
    title: t('list.buttons.add'),
    icon: 'RiAddLine',
    url: '/admin/showcase-videos/add',
  });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} actions={actions} tabs={tabs} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
