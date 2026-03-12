import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getUuid } from '@/shared/lib/hash';
import {
  addShowcaseVideo,
  ShowcaseVideoStatus,
} from '@/shared/models/showcase-video';
import type { NewShowcaseVideo } from '@/shared/models/showcase-video';
import { getTaxonomies, TaxonomyType } from '@/shared/models/taxonomy';
import { getUserInfo } from '@/shared/models/user';
import type { Crumb } from '@/shared/types/blocks/common';
import type { Form } from '@/shared/types/blocks/form';

export default async function ShowcaseVideoAddPage({
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

  const t = await getTranslations('admin.showcase-videos');

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    limit: 200,
  });

  const crumbs: Crumb[] = [
    { title: t('add.crumbs.admin'), url: '/admin' },
    { title: t('add.crumbs.videos'), url: '/admin/showcase-videos' },
    { title: t('add.crumbs.add'), is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'categoryId',
        type: 'select',
        title: t('fields.category'),
        validation: { required: true },
        options: categories.map((category) => ({
          title: category.title,
          value: category.id,
        })),
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
        attributes: { rows: 6 },
      },
      {
        name: 'videoUrl',
        type: 'url',
        title: t('fields.videoUrl'),
        validation: { required: true },
        metadata: {
          mediaLibraryPicker: {
            mediaType: 'video',
            buttonText: t('add.buttons.chooseVideo'),
          },
        },
      },
      {
        name: 'coverUrl',
        type: 'upload_image',
        title: t('fields.coverUrl'),
        metadata: { max: 1 },
      },
      {
        name: 'status',
        type: 'select',
        title: t('fields.status'),
        value: ShowcaseVideoStatus.PENDING,
        validation: { required: true },
        options: [
          { title: t('statuses.draft'), value: ShowcaseVideoStatus.DRAFT },
          { title: t('statuses.pending'), value: ShowcaseVideoStatus.PENDING },
          { title: t('statuses.published'), value: ShowcaseVideoStatus.PUBLISHED },
          { title: t('statuses.rejected'), value: ShowcaseVideoStatus.REJECTED },
          { title: t('statuses.archived'), value: ShowcaseVideoStatus.ARCHIVED },
        ],
      },
      {
        name: 'featured',
        type: 'switch',
        title: t('fields.featuredSwitch'),
        value: false,
      },
      {
        name: 'sort',
        type: 'number',
        title: t('fields.sort'),
        value: 0,
      },
      {
        name: 'reviewNote',
        type: 'textarea',
        title: t('fields.reviewNote'),
        attributes: { rows: 4 },
      },
    ],
    data: {},
    submit: {
      button: {
        title: t('add.buttons.submit'),
      },
      handler: async (data) => {
        'use server';

        const user = await getUserInfo();
        if (!user) {
          throw new Error('no auth');
        }

        const categoryId = String(data.get('categoryId') || '').trim();
        const title = String(data.get('title') || '').trim();
        const description = String(data.get('description') || '').trim();
        const videoUrl = String(data.get('videoUrl') || '').trim();
        const coverUrl = String(data.get('coverUrl') || '').trim();
        const status = String(data.get('status') || ShowcaseVideoStatus.PENDING);
        const featured = String(data.get('featured') || 'false') === 'true';
        const sort = Number(data.get('sort') || 0);
        const reviewNote = String(data.get('reviewNote') || '').trim();

        if (!categoryId || !title || !videoUrl) {
          throw new Error('missing required fields');
        }

        const newVideo: NewShowcaseVideo = {
          id: getUuid(),
          userId: user.id,
          categoryId,
          sourceTaskId: null,
          sourceType: 'upload',
          title,
          description,
          videoUrl,
          coverUrl,
          status,
          featured,
          sort: Number.isFinite(sort) ? sort : 0,
          reviewNote,
          publishedAt:
            status === ShowcaseVideoStatus.PUBLISHED ? new Date() : null,
        };

        const result = await addShowcaseVideo(newVideo);
        if (!result) {
          throw new Error('add showcase video failed');
        }

        return {
          status: 'success',
          message: t('add.messages.success'),
          redirect_url: '/admin/showcase-videos',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('add.title')} />
        <FormCard form={form} className="md:max-w-2xl" />
      </Main>
    </>
  );
}
