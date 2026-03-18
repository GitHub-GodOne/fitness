import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getUuid } from '@/shared/lib/hash';
import { addUrlToSitemap } from '@/shared/lib/sitemap-updater';
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
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.CATEGORIES_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.showcase-categories');

  const crumbs: Crumb[] = [
    { title: t('add.crumbs.admin'), url: '/admin' },
    { title: t('add.crumbs.categories'), url: '/admin/showcase-categories' },
    { title: t('add.crumbs.add'), is_active: true },
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
        metadata: {
          max: 1,
          allowDirectUrl: true,
          directUrlLabel: t('fields.imageUrlLabel'),
          directUrlPlaceholder: t('fields.imageUrlPlaceholder'),
          mediaLibraryPicker: {
            mediaType: 'image',
            buttonText: t('fields.chooseImage'),
          },
        },
      },
      {
        name: 'sort',
        type: 'number',
        title: t('fields.sort'),
        value: 0,
      },
      {
        name: 'status',
        type: 'select',
        title: t('fields.status'),
        value: TaxonomyStatus.PUBLISHED,
        options: [
          { title: t('statuses.published'), value: TaxonomyStatus.PUBLISHED },
          { title: t('statuses.draft'), value: TaxonomyStatus.DRAFT },
          { title: t('statuses.pending'), value: TaxonomyStatus.PENDING },
          { title: t('statuses.archived'), value: TaxonomyStatus.ARCHIVED },
        ],
      },
    ],
    data: {},
    submit: {
      button: {
        title: t('add.buttons.submit'),
      },
      handler: async (data) => {
        'use server';

        const actionT = await getTranslations({
          locale,
          namespace: 'admin.showcase-categories',
        });

        const user = await getUserInfo();
        if (!user) {
          return { status: 'error', message: 'Please sign in again' } as const;
        }

        const slug = String(data.get('slug') || '').trim().toLowerCase();
        const title = String(data.get('title') || '').trim();
        const description = String(data.get('description') || '').trim();
        const image = String(data.get('image') || '').trim();
        const sort = Number(data.get('sort') || 0);
        const status = String(data.get('status') || TaxonomyStatus.PUBLISHED);

        if (!slug || !title) {
          return {
            status: 'error',
            message: 'Slug and title are required',
          } as const;
        }

        if (!/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(slug)) {
          return {
            status: 'error',
            message: actionT('add.messages.invalidSlug'),
          } as const;
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
          return {
            status: 'error',
            message: 'Failed to add showcase category',
          } as const;
        }

        await addUrlToSitemap(`/showcases/${slug}`);

        return {
          status: 'success',
          message: actionT('add.messages.success'),
          redirect_url: '/admin/showcase-categories',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('add.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
