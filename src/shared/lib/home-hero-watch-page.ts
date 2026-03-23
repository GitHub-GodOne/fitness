import enIndex from '@/config/locale/messages/en/pages/index.json';
import zhIndex from '@/config/locale/messages/zh/pages/index.json';

type HomeHeroMessages = typeof enIndex;

export type HomeHeroWatchPage = {
  locale: string;
  slug: string;
  url: string;
  title: string;
  description: string;
  linkTitle?: string;
  videoLabel: string;
  backTitle: string;
  ctaTitle?: string;
  ctaUrl?: string;
  uploadDate?: string;
  videoSrc: string;
  videoPoster?: string;
};

function getHeroSection(messages: HomeHeroMessages) {
  return messages.page.sections.hero as any;
}

function buildHomeHeroWatchPage(locale: string, messages: HomeHeroMessages) {
  const hero = getHeroSection(messages);
  const watchPage = hero.watch_page;
  const featuredVideo = hero.featured_video;

  if (!watchPage?.slug || !watchPage?.url || !featuredVideo?.src) {
    return null;
  }

  return {
    locale,
    slug: String(watchPage.slug),
    url: String(watchPage.url),
    title: String(watchPage.title || hero.title || ''),
    description: String(watchPage.description || hero.description || ''),
    linkTitle: watchPage.link_title ? String(watchPage.link_title) : undefined,
    videoLabel: String(watchPage.video_label || 'Featured video'),
    backTitle: String(watchPage.back_title || 'Back to home'),
    ctaTitle: watchPage.cta_title ? String(watchPage.cta_title) : undefined,
    ctaUrl: watchPage.cta_url ? String(watchPage.cta_url) : undefined,
    uploadDate: watchPage.upload_date ? String(watchPage.upload_date) : undefined,
    videoSrc: String(featuredVideo.src),
    videoPoster: featuredVideo.poster ? String(featuredVideo.poster) : undefined,
  } satisfies HomeHeroWatchPage;
}

export function getAllHomeHeroWatchPages() {
  return [
    buildHomeHeroWatchPage('en', enIndex),
    buildHomeHeroWatchPage('zh', zhIndex),
  ].filter(Boolean) as HomeHeroWatchPage[];
}

export function getHomeHeroWatchPageBySlug(locale: string, slug: string) {
  return (
    getAllHomeHeroWatchPages().find(
      (item) => item.locale === locale && item.slug === slug
    ) || null
  );
}
