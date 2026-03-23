import { getAllConfigs } from '@/shared/models/config';
import { getAllHomeHeroWatchPages } from '@/shared/lib/home-hero-watch-page';
import {
  getShowcaseVideos,
  type ShowcaseVideo,
  ShowcaseVideoStatus,
} from '@/shared/models/showcase-video';
import {
  getShowcaseVideoDescription,
  getShowcaseVideoPublishedAt,
  getShowcaseVideoThumbnailUrl,
  getShowcaseVideoWatchAbsoluteUrl,
  toPublicAbsoluteUrl,
} from '@/shared/lib/showcase-video-seo';

const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(value?: string) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

export async function GET() {
  const configs = await getAllConfigs();
  const watchPagesEnabled = configs.showcases_video_page_mode === 'watch_page';
  const homeHeroWatchPages = getAllHomeHeroWatchPages();

  const videos = watchPagesEnabled
    ? await getShowcaseVideos({
        status: ShowcaseVideoStatus.PUBLISHED,
        limit: 1000,
      })
    : [];

  const showcaseBody = videos
    .filter((video: ShowcaseVideo) => video.videoUrl)
    .map((video: ShowcaseVideo) => {
      const watchUrl = getShowcaseVideoWatchAbsoluteUrl({ video });
      const thumbnailUrl = getShowcaseVideoThumbnailUrl(video);
      const description = getShowcaseVideoDescription(
        video,
        'Watch this published showcase video.'
      );

      return `  <url>
    <loc>${escapeXml(watchUrl)}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(description)}</video:description>
      <video:content_loc>${escapeXml(toPublicAbsoluteUrl(video.videoUrl))}</video:content_loc>
      <video:publication_date>${escapeXml(getShowcaseVideoPublishedAt(video).toISOString())}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
  </url>`;
    })
    .join('\n');

  const heroBody = homeHeroWatchPages
    .filter((item) => item.videoSrc)
    .map((item) => {
      const thumbnailUrl = toPublicAbsoluteUrl(item.videoPoster);

      return `  <url>
    <loc>${escapeXml(toPublicAbsoluteUrl(item.url))}</loc>
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbnailUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(item.title)}</video:title>
      <video:description>${escapeXml(item.description)}</video:description>
      <video:content_loc>${escapeXml(toPublicAbsoluteUrl(item.videoSrc))}</video:content_loc>
      ${toIsoDate(item.uploadDate) ? `<video:publication_date>${escapeXml(toIsoDate(item.uploadDate))}</video:publication_date>` : ''}
      <video:family_friendly>yes</video:family_friendly>
    </video:video>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${showcaseBody}
${heroBody}
</urlset>`;

  return new Response(xml, {
    headers: XML_HEADERS,
  });
}
