import { setRequestLocale } from 'next-intl/server';

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
  const isZh = locale === 'zh';
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const { page: pageNum, pageSize, status } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;
  const activeStatus =
    status && status !== 'all' ? status : undefined;

  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: isZh ? '案例视频' : 'Showcase Videos', is_active: true },
  ];

  const tabs: Tab[] = [
    {
      name: 'all',
      title: isZh ? '全部' : 'All',
      url: '/admin/showcase-videos',
      is_active: !activeStatus,
    },
    {
      name: ShowcaseVideoStatus.PENDING,
      title: isZh ? '待审核' : 'Pending',
      url: `/admin/showcase-videos?status=${ShowcaseVideoStatus.PENDING}`,
      is_active: activeStatus === ShowcaseVideoStatus.PENDING,
    },
    {
      name: ShowcaseVideoStatus.PUBLISHED,
      title: isZh ? '已发布' : 'Published',
      url: `/admin/showcase-videos?status=${ShowcaseVideoStatus.PUBLISHED}`,
      is_active: activeStatus === ShowcaseVideoStatus.PUBLISHED,
    },
    {
      name: ShowcaseVideoStatus.REJECTED,
      title: isZh ? '已拒绝' : 'Rejected',
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
    featuredLabel: video.featured ? (isZh ? '推荐' : 'Featured') : (isZh ? '普通' : 'Normal'),
  }));

  const table: Table = {
    columns: [
      { name: 'title', title: isZh ? '标题' : 'Title' },
      { name: 'categoryTitle', title: isZh ? '分类' : 'Category' },
      { name: 'user', title: isZh ? '用户' : 'User', type: 'user' },
      { name: 'status', title: isZh ? '状态' : 'Status', type: 'label' },
      { name: 'featuredLabel', title: isZh ? '推荐位' : 'Featured', type: 'label' },
      { name: 'createdAt', title: isZh ? '提交时间' : 'Submitted', type: 'time' },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: ShowcaseVideo) => [
          {
            title: isZh ? '审核 / 编辑' : 'Review / Edit',
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

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={isZh ? '案例视频审核' : 'Showcase Video Review'}
          actions={actions}
          tabs={tabs}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
