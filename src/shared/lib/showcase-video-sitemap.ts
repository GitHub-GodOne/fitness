import { revalidatePath } from 'next/cache';

import { getShowcaseVideoWatchPath } from '@/shared/lib/showcase-video-url';
import {
  addUrlToSitemap,
  removeUrlFromSitemap,
} from '@/shared/lib/sitemap-updater';
import { getAllConfigs } from '@/shared/models/config';
import type { ShowcaseVideo } from '@/shared/models/showcase-video';
import { ShowcaseVideoStatus } from '@/shared/models/showcase-video';

function getIndexedWatchPath(video?: ShowcaseVideo | null) {
  if (!video) {
    return null;
  }

  if (
    video.status !== ShowcaseVideoStatus.PUBLISHED ||
    !video.videoUrl?.trim()
  ) {
    return null;
  }

  return getShowcaseVideoWatchPath({ video });
}

export async function syncShowcaseVideoSitemapEntry({
  previousVideo,
  nextVideo,
}: {
  previousVideo?: ShowcaseVideo | null;
  nextVideo?: ShowcaseVideo | null;
}) {
  const configs = await getAllConfigs();
  const watchPagesEnabled = configs.showcases_video_page_mode === 'watch_page';

  const previousPath = getIndexedWatchPath(previousVideo);
  const nextPath = watchPagesEnabled ? getIndexedWatchPath(nextVideo) : null;

  if (previousPath && previousPath !== nextPath) {
    await removeUrlFromSitemap(previousPath);
  }

  if (nextPath) {
    await addUrlToSitemap(nextPath, '0.80');
  }

  revalidatePath('/video-sitemap.xml');
}
