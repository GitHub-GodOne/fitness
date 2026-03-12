import { setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getUuid } from '@/shared/lib/hash';
import {
  addTaxonomy,
  TaxonomyStatus,
  TaxonomyType,
} from '@/shared/models/taxonomy';
import type { NewTaxonomy } from '@/shared/models/taxonomy';
import { getUserInfo } from '@/shared/models/user';
import type { Crumb } from '@/shared/types/blocks/common';
import type { Form } from '@/shared/types/blocks/form';

export default async function ShowcaseCategoryAddPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isZh = locale === 'zh';
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.CATEGORIES_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: isZh ? '案例分类' : 'Showcase Categories', url: '/admin/showcase-categories' },
    { title: isZh ? '新增' : 'Add', is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'slug',
        type: 'text',
        title: 'Slug',
        tip: isZh ? '唯一标识，建议用英文短横线格式' : 'Unique slug, prefer kebab-case',
        validation: { required: true },
      },
      {
        name: 'title',
        type: 'text',
        title: isZh ? '标题' : 'Title',
        validation: { required: true },
      },
      {
        name: 'description',
        type: 'textarea',
        title: isZh ? '描述' : 'Description',
        attributes: { rows: 5 },
      },
      {
        name: 'image',
        type: 'upload_image',
        title: isZh ? '分类图片' : 'Category Image',
        metadata: { max: 1 },
      },
      {
        name: 'sort',
        type: 'number',
        title: isZh ? '排序' : 'Sort',
        value: 0,
      },
      {
        name: 'status',
        type: 'select',
        title: isZh ? '状态' : 'Status',
        value: TaxonomyStatus.PUBLISHED,
        options: [
          { title: isZh ? '已发布' : 'Published', value: TaxonomyStatus.PUBLISHED },
          { title: isZh ? '草稿' : 'Draft', value: TaxonomyStatus.DRAFT },
          { title: isZh ? '待审核' : 'Pending', value: TaxonomyStatus.PENDING },
          { title: isZh ? '已归档' : 'Archived', value: TaxonomyStatus.ARCHIVED },
        ],
      },
    ],
    data: {},
    submit: {
      button: {
        title: isZh ? '创建分类' : 'Create Category',
      },
      handler: async (data) => {
        'use server';

        const user = await getUserInfo();
        if (!user) {
          throw new Error('no auth');
        }

        const slug = String(data.get('slug') || '').trim().toLowerCase();
        const title = String(data.get('title') || '').trim();
        const description = String(data.get('description') || '').trim();
        const image = String(data.get('image') || '').trim();
        const sort = Number(data.get('sort') || 0);
        const status = String(data.get('status') || TaxonomyStatus.PUBLISHED);

        if (!slug || !title) {
          throw new Error('slug and title are required');
        }

        const newCategory: NewTaxonomy = {
          id: getUuid(),
          userId: user.id,
          parentId: '',
          slug,
          type: TaxonomyType.SHOWCASE_CATEGORY,
          title,
          description,
          image,
          icon: '',
          status,
          sort: Number.isFinite(sort) ? sort : 0,
        };

        const result = await addTaxonomy(newCategory);
        if (!result) {
          throw new Error('add showcase category failed');
        }

        return {
          status: 'success',
          message: isZh ? '案例分类已创建' : 'Showcase category created',
          redirect_url: '/admin/showcase-categories',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={isZh ? '新增案例分类' : 'Add Showcase Category'} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
