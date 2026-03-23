import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/core/i18n/navigation';
import { defaultLocale } from '@/config/locale';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getShowcaseVideoWatchPath } from '@/shared/lib/showcase-video-url';
import {
  buildShowcaseVideoObject,
  getShowcaseVideoDescription,
  getShowcaseVideoPublishedAt,
  getShowcaseVideoThumbnailUrl,
  getShowcaseVideoWatchAbsoluteUrl,
} from '@/shared/lib/showcase-video-seo';
import {
  findPublishedShowcaseVideoByWatchSlug,
  getShowcaseVideos,
  type ShowcaseVideo,
  ShowcaseVideoStatus,
} from '@/shared/models/showcase-video';
import {
  getTaxonomies,
  TaxonomyStatus,
  TaxonomyType,
} from '@/shared/models/taxonomy';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: `showcases/watch/${slug}`,
    locale,
    canonicalPath: `/showcases/watch/${slug}`,
  });

  if (customHtmlMetadata) {
    return customHtmlMetadata;
  }

  const video = await findPublishedShowcaseVideoByWatchSlug(slug);
  if (!video) {
    return {};
  }

  const description = getShowcaseVideoDescription(
    video,
    'Watch this published showcase video.'
  );
  const canonical = getShowcaseVideoWatchAbsoluteUrl({ video, locale });
  const thumbnailUrl = getShowcaseVideoThumbnailUrl(video);

  return {
    title: video.title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'video.other',
      locale,
      url: canonical,
      title: video.title,
      description,
      images: thumbnailUrl ? [{ url: thumbnailUrl }] : undefined,
      videos: video.videoUrl
        ? [
            {
              url: video.videoUrl,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: video.title,
      description,
      images: thumbnailUrl ? [thumbnailUrl] : undefined,
    },
  };
}

export default async function ShowcaseWatchPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: `showcases/watch/${slug}`,
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  const t = await getTranslations({
    locale,
    namespace: 'pages.showcases.page.watch',
  });
  const dateLocale = t('dateLocale');

  const video = await findPublishedShowcaseVideoByWatchSlug(slug);
  if (!video) {
    notFound();
  }

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });
  const category = categories.find((item) => item.id === video.categoryId);

  const relatedVideos = await getShowcaseVideos({
    categoryId: video.categoryId || undefined,
    status: ShowcaseVideoStatus.PUBLISHED,
    excludeId: video.id,
    limit: 6,
  });

  const description = getShowcaseVideoDescription(video, t('descriptionFallback'));
  const videoObject = buildShowcaseVideoObject({
    video,
    locale,
    fallbackDescription: t('descriptionFallback'),
  });
  const publishedAt = getShowcaseVideoPublishedAt(video);
  const backHref = category
    ? locale === defaultLocale
      ? `/showcases/${category.slug}`
      : `/${locale}/showcases/${category.slug}`
    : locale === defaultLocale
      ? '/showcases'
      : `/${locale}/showcases`;

  return (
    <div className="container pb-16 pt-24 lg:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoObject),
        }}
      />

      <div className="mx-auto max-w-5xl space-y-10">
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={backHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {category ? t('backToCategory') : t('backToShowcases')}
            </Link>

            {category ? (
              <Link
                href={
                  locale === defaultLocale
                    ? `/showcases/${category.slug}`
                    : `/${locale}/showcases/${category.slug}`
                }
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                {category.title}
              </Link>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t('videoLabel')}
            </p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {video.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                {publishedAt.toLocaleDateString(dateLocale)}
              </span>
            </div>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="overflow-hidden rounded-3xl border bg-black shadow-sm">
            <video
              src={video.videoUrl}
              poster={getShowcaseVideoThumbnailUrl(video) || undefined}
              controls
              preload="metadata"
              playsInline
              className="aspect-video w-full bg-black object-contain"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('relatedTitle')}
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            {t('relatedDescription')}
          </p>

          {relatedVideos.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
              {t('emptyRelatedVideos')}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {relatedVideos.map((relatedVideo: ShowcaseVideo) => (
                <Link
                  key={relatedVideo.id}
                  href={getShowcaseVideoWatchPath({ video: relatedVideo, locale })}
                  className="group overflow-hidden rounded-3xl border bg-card transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {relatedVideo.coverUrl ? (
                      <img
                        src={relatedVideo.coverUrl}
                        alt={relatedVideo.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
                        <span className="text-3xl font-semibold text-foreground/70">
                          {relatedVideo.title.slice(0, 1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-5">
                    <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold text-foreground">
                      {relatedVideo.title}
                    </h3>
                    <p className="line-clamp-3 min-h-[3.75rem] text-sm text-muted-foreground">
                      {getShowcaseVideoDescription(
                        relatedVideo,
                        t('descriptionFallback')
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
