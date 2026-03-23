import { defaultLocale } from '@/config/locale';

function slugifyShowcaseVideoTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-') || 'video';
}

export function getShowcaseVideoWatchSlug(video: {
  id: string;
  title?: string | null;
}) {
  return `${slugifyShowcaseVideoTitle(video.title || 'video')}--${video.id}`;
}

export function getShowcaseVideoWatchPath({
  video,
  locale = defaultLocale,
}: {
  video: {
    id: string;
    title?: string | null;
  };
  locale?: string;
}) {
  const slug = getShowcaseVideoWatchSlug(video);
  return locale === defaultLocale
    ? `/showcases/watch/${slug}`
    : `/${locale}/showcases/watch/${slug}`;
}

export function parseShowcaseVideoIdFromWatchSlug(watchSlug: string) {
  return watchSlug.split('--').pop()?.trim() || '';
}
