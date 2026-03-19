import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  findShowcaseVideoById,
  ShowcaseVideoStatus,
  updateShowcaseVideo,
} from '@/shared/models/showcase-video';
import type { UpdateShowcaseVideo } from '@/shared/models/showcase-video';
import { getTaxonomies, TaxonomyType } from '@/shared/models/taxonomy';
import { getUserInfo } from '@/shared/models/user';
import type { Crumb } from '@/shared/types/blocks/common';
import type { Form } from '@/shared/types/blocks/form';

export default async function ShowcaseVideoEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.showcase-videos');

  const video = await findShowcaseVideoById(id);
  if (!video) {
    return <Empty message={t('edit.messages.notFound')} />;
  }

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    limit: 200,
  });

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: '/admin' },
    { title: t('edit.crumbs.videos'), url: '/admin/showcase-videos' },
    { title: t('edit.crumbs.edit'), is_active: true },
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
            buttonText: t('edit.buttons.chooseVideo'),
          },
          mediaUpload: {
            mediaType: 'video',
            path: 'media-library/showcase-videos/video',
            buttonText: t('edit.buttons.uploadVideo'),
          },
        },
      },
      {
        name: 'coverUrl',
        type: 'upload_image',
        title: t('fields.coverUrl'),
        metadata: {
          max: 1,
          allowDirectUrl: true,
          directUrlLabel: t('edit.fields.coverUrlDirectLabel'),
          directUrlPlaceholder: t('edit.fields.coverUrlDirectPlaceholder'),
          mediaLibraryPicker: {
            mediaType: 'image',
            buttonText: t('edit.buttons.chooseCover'),
          },
        },
      },
      {
        name: 'status',
        type: 'select',
        title: t('fields.status'),
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
      },
      {
        name: 'sort',
        type: 'number',
        title: t('fields.sort'),
      },
      {
        name: 'reviewNote',
        type: 'textarea',
        title: t('fields.reviewNote'),
        attributes: { rows: 4 },
      },
    ],
    data: video,
    submit: {
      button: {
        title: t('edit.buttons.submit'),
      },
      handler: async (data) => {
        'use server';

        const actionT = await getTranslations({
          locale,
          namespace: 'admin.showcase-videos',
        });

        const user = await getUserInfo();
        if (!user) {
          return { status: 'error', message: 'Please sign in again' } as const;
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
          return {
            status: 'error',
            message: 'Category, title and video URL are required',
          } as const;
        }

        const publishedAt =
          status === ShowcaseVideoStatus.PUBLISHED
            ? video.publishedAt || new Date()
            : null;

        const updateData: UpdateShowcaseVideo = {
          categoryId,
          title,
          description,
          videoUrl,
          coverUrl,
          status,
          featured,
          sort: Number.isFinite(sort) ? sort : 0,
          reviewNote,
          publishedAt,
        };

        const result = await updateShowcaseVideo(video.id, updateData);
        if (!result) {
          return {
            status: 'error',
            message: 'Failed to update showcase video',
          } as const;
        }

        return {
          status: 'success',
          message: actionT('edit.messages.success'),
          redirect_url: '/admin/showcase-videos',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit.title')} />
        <FormCard form={form} className="md:max-w-2xl" />
      </Main>
    </>
  );
}
