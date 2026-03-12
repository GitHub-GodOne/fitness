import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { Empty } from '@/shared/blocks/common';
import {
  addShowcaseVideo,
  findShowcaseVideoBySourceTaskId,
  ShowcaseVideoStatus,
} from '@/shared/models/showcase-video';
import { findAITaskById, getAITasks } from '@/shared/models/ai_task';
import {
  findTaxonomy,
  getTaxonomies,
  TaxonomyStatus,
  TaxonomyType,
} from '@/shared/models/taxonomy';
import { getUserInfo } from '@/shared/models/user';
import { getUuid } from '@/shared/lib/hash';
import {
  extractShowcaseDescriptionFromAITask,
  extractShowcaseTitleFromAITask,
  extractVideoCoverFromAITask,
  extractVideoUrlFromAITask,
} from '@/shared/lib/ai-task-video';

import { ShowcaseSubmitForm, type SubmitResult } from './showcase-submit-form';

export default async function ShowcaseSubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.showcases.page.submit' });
  const user = await getUserInfo();

  if (!user) {
    return <Empty message={t('messages.loginRequired')} />;
  }

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });

  const tasks = await getAITasks({
    userId: user.id,
    mediaType: AIMediaType.VIDEO,
    status: AITaskStatus.SUCCESS,
    limit: 100,
  });

  const selectableTasks = tasks
    .map((task) => ({
      task,
      videoUrl: extractVideoUrlFromAITask({
        taskInfo: task.taskInfo,
        taskResult: task.taskResult,
      }),
      coverUrl: extractVideoCoverFromAITask(task.taskResult) || '',
      title: extractShowcaseTitleFromAITask({
        prompt: task.prompt,
        taskResult: task.taskResult,
      }),
      description: extractShowcaseDescriptionFromAITask({
        prompt: task.prompt,
        taskResult: task.taskResult,
      }),
    }))
    .filter((item) => Boolean(item.videoUrl));

  if (categories.length === 0) {
    return <Empty message={t('messages.noCategories')} />;
  }

  if (selectableTasks.length === 0) {
    return <Empty message={t('messages.noVideos')} />;
  }

  const handleSubmit = async (
    data: FormData,
    passby: { userId: string; locale: string }
  ): Promise<SubmitResult> => {
    'use server';

    const user = await getUserInfo();
    if (!user || user.id !== passby.userId) {
      throw new Error('no auth');
    }

    const sourceTaskId = String(data.get('source_task_id') || '');
    const categoryId = String(data.get('category_id') || '');
    const title = String(data.get('title') || '').trim();
    const description = String(data.get('description') || '').trim();
    const coverUrlInput = String(data.get('cover_url') || '').trim();

    if (!sourceTaskId || !categoryId || !title) {
      throw new Error('missing required fields');
    }

    const category = await findTaxonomy({ id: categoryId, status: TaxonomyStatus.PUBLISHED });
    if (!category || category.type !== TaxonomyType.SHOWCASE_CATEGORY) {
      const submitT = await getTranslations({
        locale: passby.locale,
        namespace: 'pages.showcases.page.submit',
      });
      throw new Error(submitT('messages.categoryNotFound'));
    }

    const duplicate = await findShowcaseVideoBySourceTaskId({
      userId: user.id,
      sourceTaskId,
    });

    if (duplicate) {
      const submitT = await getTranslations({
        locale: passby.locale,
        namespace: 'pages.showcases.page.submit',
      });
      throw new Error(submitT('messages.alreadySubmitted'));
    }

    const task = await findAITaskById(sourceTaskId);

    if (
      !task ||
      task.userId !== user.id ||
      task.mediaType !== AIMediaType.VIDEO ||
      task.status !== AITaskStatus.SUCCESS
    ) {
      throw new Error('selected task not found');
    }

    const videoUrl = extractVideoUrlFromAITask({
      taskInfo: task.taskInfo,
      taskResult: task.taskResult,
    });

    if (!videoUrl) {
      throw new Error('video url not found');
    }

    const coverUrl =
      coverUrlInput || extractVideoCoverFromAITask(task.taskResult) || '';

    await addShowcaseVideo({
      id: getUuid(),
      userId: user.id,
      categoryId,
      sourceTaskId,
      sourceType: 'generated',
      title,
      description:
        description ||
        extractShowcaseDescriptionFromAITask({
          prompt: task.prompt,
          taskResult: task.taskResult,
        }),
      videoUrl,
      coverUrl,
      status: ShowcaseVideoStatus.PENDING,
      featured: false,
      sort: 0,
      reviewNote: '',
      publishedAt: null,
    });

    return {
      status: 'success',
      message: (
        await getTranslations({
          locale: passby.locale,
          namespace: 'pages.showcases.page.submit',
        })
      )('messages.success'),
      redirect_url: '/showcases',
    };
  };

  return (
    <div className="container pb-16 pt-24 lg:pt-28">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3">
          <Link
            href="/showcases"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            aria-label={t('backToShowcases')}
            title={t('backToShowcases')}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        <ShowcaseSubmitForm
          locale={locale}
          userId={user.id}
          selectableTasks={selectableTasks.map((item) => ({
            id: item.task.id,
            title: item.title,
            description: item.description,
            videoUrl: item.videoUrl as string,
            coverUrl: item.coverUrl,
          }))}
          categories={categories.map((category) => ({
            id: category.id,
            title: category.title,
          }))}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
