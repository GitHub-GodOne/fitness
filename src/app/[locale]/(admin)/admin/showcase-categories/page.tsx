import { getTranslations, setRequestLocale } from 'next-intl/server';

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
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.CATEGORIES_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.showcase-categories');

  const { page: pageNum, pageSize } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  const crumbs: Crumb[] = [
    { title: t('list.crumbs.admin'), url: '/admin' },
    { title: t('list.crumbs.categories'), is_active: true },
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
        title: t('fields.slug'),
        type: 'copy',
        metadata: { message: t('fields.copyMessage') },
      },
      { name: 'title', title: t('fields.title') },
      { name: 'status', title: t('fields.status'), type: 'label' },
      { name: 'sort', title: t('fields.sort') },
      { name: 'updatedAt', title: t('fields.updatedAt'), type: 'time' },
      {
        name: 'action',
        title: '',
        type: 'dropdown',
        callback: (item: Taxonomy) => [
          {
            id: 'edit',
            title: t('list.buttons.edit'),
            icon: 'RiEditLine',
            url: `/admin/showcase-categories/${item.id}/edit`,
          },
        ],
      },
    ],
    actions: [
      {
        id: 'edit',
        title: t('list.buttons.edit'),
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
      title: t('list.buttons.add'),
      icon: 'RiAddLine',
      url: '/admin/showcase-categories/add',
    },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} actions={actions} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
