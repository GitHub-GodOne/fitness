import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { getShowcaseVideoWatchPath } from '@/shared/lib/showcase-video-url';
import { type ShowcaseVideo } from '@/shared/models/showcase-video';

export function toPublicAbsoluteUrl(url?: string | null) {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const appUrl = envConfigs.app_url.replace(/\/$/, '');
  return url.startsWith('/') ? `${appUrl}${url}` : `${appUrl}/${url}`;
}

export function getShowcaseVideoPublishedAt(video: ShowcaseVideo) {
  return video.publishedAt || video.createdAt;
}

export function getShowcaseVideoDescription(
  video: ShowcaseVideo,
  fallbackDescription: string
) {
  return video.description?.trim() || fallbackDescription;
}

export function getShowcaseVideoThumbnailUrl(video: ShowcaseVideo) {
  return toPublicAbsoluteUrl(video.coverUrl || envConfigs.app_preview_image);
}

export function getShowcaseVideoWatchAbsoluteUrl({
  video,
  locale = defaultLocale,
}: {
  video: ShowcaseVideo;
  locale?: string;
}) {
  return toPublicAbsoluteUrl(getShowcaseVideoWatchPath({ video, locale }));
}

export function buildShowcaseVideoObject({
  video,
  locale = defaultLocale,
  fallbackDescription,
}: {
  video: ShowcaseVideo;
  locale?: string;
  fallbackDescription: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.title,
    description: getShowcaseVideoDescription(video, fallbackDescription),
    thumbnailUrl: getShowcaseVideoThumbnailUrl(video),
    uploadDate: getShowcaseVideoPublishedAt(video).toISOString(),
    contentUrl: toPublicAbsoluteUrl(video.videoUrl),
    embedUrl: getShowcaseVideoWatchAbsoluteUrl({ video, locale }),
    url: getShowcaseVideoWatchAbsoluteUrl({ video, locale }),
    inLanguage: locale,
    isFamilyFriendly: true,
  };
}
