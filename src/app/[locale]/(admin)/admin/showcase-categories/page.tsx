import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { TableCard } from '@/shared/blocks/table';
import {
  getTaxonomies,
  getTaxonomiesCount,
  TaxonomyType,
} from '@/shared/models/taxonomy';
import type { Taxonomy } from '@/shared/models/taxonomy';
import type { Button, Crumb } from '@/shared/types/blocks/common';
import type { Table } from '@/shared/types/blocks/table';

export default async function ShowcaseCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number }>;
}) {
  const { locale } = await params;
  const isZh = locale === 'zh';
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.CATEGORIES_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const { page: pageNum, pageSize } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: isZh ? '案例分类' : 'Showcase Categories', is_active: true },
  ];

  const total = await getTaxonomiesCount({
    type: TaxonomyType.SHOWCASE_CATEGORY,
  });
  const data = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    page,
    limit,
  });

  const table: Table = {
    columns: [
      {
        name: 'slug',
        title: 'Slug',
        type: 'copy',
        metadata: { message: isZh ? '已复制' : 'Copied' },
      },
      { name: 'title', title: isZh ? '标题' : 'Title' },
      { name: 'status', title: isZh ? '状态' : 'Status', type: 'label' },
      { name: 'sort', title: isZh ? '排序' : 'Sort' },
      { name: 'updatedAt', title: isZh ? '更新时间' : 'Updated', type: 'time' },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: Taxonomy) => [
          {
            id: 'edit',
            title: isZh ? '编辑' : 'Edit',
            icon: 'RiEditLine',
            url: `/admin/showcase-categories/${item.id}/edit`,
          },
        ],
      },
    ],
    actions: [
      {
        id: 'edit',
        title: isZh ? '编辑' : 'Edit',
        icon: 'RiEditLine',
        url: '/admin/showcase-categories/[id]/edit',
      },
    ],
    data,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const actions: Button[] = [
    {
      id: 'add',
      title: isZh ? '新增分类' : 'Add Category',
      icon: 'RiAddLine',
      url: '/admin/showcase-categories/add',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={isZh ? '案例分类' : 'Showcase Categories'}
          actions={actions}
        />
        <TableCard table={table} />
      </Main>
    </>
  );
}
