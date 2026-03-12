import { setRequestLocale } from 'next-intl/server';

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
  const isZh = locale === 'zh';
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const video = await findShowcaseVideoById(id);
  if (!video) {
    return <Empty message={isZh ? '案例视频不存在' : 'Showcase video not found'} />;
  }

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    limit: 200,
  });

  const crumbs: Crumb[] = [
    { title: isZh ? '后台' : 'Admin', url: '/admin' },
    { title: isZh ? '案例视频' : 'Showcase Videos', url: '/admin/showcase-videos' },
    { title: isZh ? '编辑' : 'Edit', is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'categoryId',
        type: 'select',
        title: isZh ? '分类' : 'Category',
        validation: { required: true },
        options: categories.map((category) => ({
          title: category.title,
          value: category.id,
        })),
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
        attributes: { rows: 6 },
      },
      {
        name: 'videoUrl',
        type: 'url',
        title: isZh ? '视频地址' : 'Video URL',
        validation: { required: true },
      },
      {
        name: 'coverUrl',
        type: 'upload_image',
        title: isZh ? '封面图' : 'Cover Image',
        metadata: { max: 1 },
      },
      {
        name: 'status',
        type: 'select',
        title: isZh ? '状态' : 'Status',
        validation: { required: true },
        options: [
          { title: isZh ? '草稿' : 'Draft', value: ShowcaseVideoStatus.DRAFT },
          { title: isZh ? '待审核' : 'Pending', value: ShowcaseVideoStatus.PENDING },
          { title: isZh ? '已发布' : 'Published', value: ShowcaseVideoStatus.PUBLISHED },
          { title: isZh ? '已拒绝' : 'Rejected', value: ShowcaseVideoStatus.REJECTED },
          { title: isZh ? '已归档' : 'Archived', value: ShowcaseVideoStatus.ARCHIVED },
        ],
      },
      {
        name: 'featured',
        type: 'switch',
        title: isZh ? '推荐展示' : 'Featured',
      },
      {
        name: 'sort',
        type: 'number',
        title: isZh ? '排序' : 'Sort',
      },
      {
        name: 'reviewNote',
        type: 'textarea',
        title: isZh ? '审核备注' : 'Review Note',
        attributes: { rows: 4 },
      },
    ],
    data: video,
    submit: {
      button: {
        title: isZh ? '保存审核结果' : 'Save Review',
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
          throw new Error('update showcase video failed');
        }

        return {
          status: 'success',
          message: isZh ? '案例视频已更新' : 'Showcase video updated',
          redirect_url: '/admin/showcase-videos',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={isZh ? '审核案例视频' : 'Review Showcase Video'} />
        <FormCard form={form} className="md:max-w-2xl" />
      </Main>
    </>
  );
}
