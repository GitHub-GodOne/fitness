import { getTranslations, setRequestLocale } from 'next-intl/server';

import { redirect } from '@/core/i18n/navigation';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { syncShowcaseVideoSitemapEntry } from '@/shared/lib/showcase-video-sitemap';
import { getConfigs, saveConfigs } from '@/shared/models/config';
import {
  deleteShowcaseVideoById,
  findShowcaseVideoById,
} from '@/shared/models/showcase-video';
import type { Crumb } from '@/shared/types/blocks/common';

export default async function DeleteShowcaseVideoPage({
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
    return <Empty message={t('delete.messages.notFound')} />;
  }

  async function deleteAction() {
    'use server';

    await requirePermission({
      code: PERMISSIONS.ADMIN_ACCESS,
      redirectUrl: '/admin/no-permission',
      locale,
    });

    await deleteShowcaseVideoById(video.id);
    await syncShowcaseVideoSitemapEntry({
      previousVideo: video,
      nextVideo: null,
    });

    const configs = await getConfigs();
    if (configs.homepage_showcase_video_id === video.id) {
      await saveConfigs({
        ...configs,
        homepage_showcase_video_id: '',
      });
    }

    redirect({
      href: '/admin/showcase-videos',
      locale,
    });
  }

  const crumbs: Crumb[] = [
    { title: t('delete.crumbs.admin'), url: '/admin' },
    { title: t('delete.crumbs.videos'), url: '/admin/showcase-videos' },
    { title: t('delete.crumbs.delete'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t('delete.title')}
          description={t('delete.description')}
        />
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{video.title}</CardTitle>
            <CardDescription>{video.videoUrl}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 text-sm">
              <p>{t('delete.messages.confirm')}</p>
              <p className="text-muted-foreground">
                {t('delete.messages.sitemap')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <form action={deleteAction}>
                <Button type="submit" variant="destructive" size="sm">
                  {t('delete.buttons.confirm')}
                </Button>
              </form>
              <Button asChild variant="outline" size="sm">
                <a href={`/admin/showcase-videos/${video.id}/edit`}>
                  {t('delete.buttons.cancel')}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
