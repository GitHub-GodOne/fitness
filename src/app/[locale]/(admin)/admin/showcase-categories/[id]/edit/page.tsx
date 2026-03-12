import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  findTaxonomy,
  TaxonomyStatus,
  TaxonomyType,
  updateTaxonomy,
} from '@/shared/models/taxonomy';
import type { UpdateTaxonomy } from '@/shared/models/taxonomy';
import { getUserInfo } from '@/shared/models/user';
import type { Crumb } from '@/shared/types/blocks/common';
import type { Form } from '@/shared/types/blocks/form';

export default async function ShowcaseCategoryEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.CATEGORIES_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.showcase-categories');

  const category = await findTaxonomy({ id });
  if (!category || category.type !== TaxonomyType.SHOWCASE_CATEGORY) {
    return <Empty message={t('edit.messages.notFound')} />;
  }

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: '/admin' },
    { title: t('edit.crumbs.categories'), url: '/admin/showcase-categories' },
    { title: t('edit.crumbs.edit'), is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'slug',
        type: 'text',
        title: t('fields.slug'),
        tip: t('fields.slugTip'),
        validation: { required: true },
      },
      {
        name: 'title',
        type: 'text',
        title: t('fields.title'),
        validation: { required: true },
      },
      {
        name: 'description',
        type: 'textarea',
        title: t('fields.description'),
        attributes: { rows: 5 },
      },
      {
        name: 'image',
        type: 'upload_image',
        title: t('fields.image'),
        metadata: { max: 1 },
      },
      {
        name: 'sort',
        type: 'number',
        title: t('fields.sort'),
      },
      {
        name: 'status',
        type: 'select',
        title: t('fields.status'),
        options: [
          { title: t('statuses.published'), value: TaxonomyStatus.PUBLISHED },
          { title: t('statuses.draft'), value: TaxonomyStatus.DRAFT },
          { title: t('statuses.pending'), value: TaxonomyStatus.PENDING },
          { title: t('statuses.archived'), value: TaxonomyStatus.ARCHIVED },
        ],
      },
    ],
    data: category,
    submit: {
      button: {
        title: t('edit.buttons.submit'),
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

        const updateCategory: UpdateTaxonomy = {
          parentId: '',
          slug,
          title,
          description,
          image,
          icon: '',
          status,
          sort: Number.isFinite(sort) ? sort : 0,
        };

        const result = await updateTaxonomy(category.id, updateCategory);
        if (!result) {
          throw new Error('update showcase category failed');
        }

        return {
          status: 'success',
          message: t('edit.messages.success'),
          redirect_url: '/admin/showcase-categories',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
