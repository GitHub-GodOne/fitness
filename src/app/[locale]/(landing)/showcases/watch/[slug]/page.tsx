import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { envConfigs } from '@/config';
import { Link } from '@/core/i18n/navigation';
import { defaultLocale } from '@/config/locale';
import { CommentSection } from '@/shared/blocks/common/comment-section';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getShowcaseVideoWatchPath } from '@/shared/lib/showcase-video-url';
import {
  buildShowcaseVideoObject,
  getShowcaseVideoDescription,
  getShowcaseVideoPublishedAt,
  getShowcaseVideoSeoKeywords,
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

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });
  const category = categories.find((item) => item.id === video.categoryId);

  const description = getShowcaseVideoDescription(
    video,
    'Watch this published showcase video.'
  );
  const canonical = getShowcaseVideoWatchAbsoluteUrl({ video, locale });
  const thumbnailUrl = getShowcaseVideoThumbnailUrl(video);
  const manualKeywords = getShowcaseVideoSeoKeywords(video);
  const keywordSet = new Set(
    [
      video.title,
      category?.title,
      'Bible verses',
      'Bible video',
      'Christian comfort video',
      'faith video',
      'showcase video',
      ...manualKeywords,
      ...slug.split('--')[0].split('-').filter(Boolean),
    ]
      .filter(Boolean)
      .map((item) => String(item).trim())
  );

  return {
    title: video.title,
    description,
    keywords: Array.from(keywordSet),
    category: category?.title || 'Showcases',
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
  const seoKeywords = Array.from(
    new Set([
      video.title,
      category?.title,
      ...getShowcaseVideoSeoKeywords(video),
      ...slug.split('--')[0].split('-').filter(Boolean),
    ].filter(Boolean).map((item) => String(item).trim()))
  );
  const videoObject = buildShowcaseVideoObject({
    video,
    locale,
    fallbackDescription: t('descriptionFallback'),
    keywords: seoKeywords,
  });
  const publishedAt = getShowcaseVideoPublishedAt(video);
  const commentsPageId = `showcase-video:${video.id}`;
  const showcasesHref =
    locale === defaultLocale ? '/showcases' : `/${locale}/showcases`;
  const categoryHref = category
    ? locale === defaultLocale
      ? `/showcases/${category.slug}`
      : `/${locale}/showcases/${category.slug}`
    : null;
  const backHref = category
    ? categoryHref!
    : showcasesHref;
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t('breadcrumbShowcases'),
        item: `${envConfigs.app_url}${showcasesHref}`,
      },
      ...(category && categoryHref
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: category.title,
              item: `${envConfigs.app_url}${categoryHref}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: category ? 3 : 2,
        name: video.title,
        item: getShowcaseVideoWatchAbsoluteUrl({ video, locale }),
      },
    ],
  };
  const relatedVideosSchema = relatedVideos.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t('relatedTitle'),
        itemListElement: relatedVideos.map(
          (relatedVideo: ShowcaseVideo, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: getShowcaseVideoWatchAbsoluteUrl({ video: relatedVideo, locale }),
            name: relatedVideo.title,
          })
        ),
      }
    : null;
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: video.title,
    description,
    url: getShowcaseVideoWatchAbsoluteUrl({ video, locale }),
    inLanguage: locale,
    keywords: seoKeywords.length ? seoKeywords.join(', ') : undefined,
    primaryImageOfPage: getShowcaseVideoThumbnailUrl(video),
    isPartOf: {
      '@type': 'WebSite',
      name: envConfigs.app_name,
      url: envConfigs.app_url,
    },
    breadcrumb: breadcrumbSchema,
    about: category
      ? {
          '@type': 'Thing',
          name: category.title,
        }
      : undefined,
    mainEntity: {
      '@type': 'VideoObject',
      name: video.title,
      description,
      contentUrl: video.videoUrl,
      embedUrl: getShowcaseVideoWatchAbsoluteUrl({ video, locale }),
      thumbnailUrl: getShowcaseVideoThumbnailUrl(video),
      uploadDate: publishedAt.toISOString(),
    },
  };

  return (
    <div className="container pb-16 pt-24 lg:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoObject),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageSchema),
        }}
      />
      {relatedVideosSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(relatedVideosSchema),
          }}
        />
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-5">
          <nav
            aria-label={t('breadcrumbLabel')}
            className="overflow-x-auto text-sm text-muted-foreground"
          >
            <ol className="flex min-w-max items-center gap-2">
              <li>
                <Link href={showcasesHref} className="transition hover:text-foreground">
                  {t('breadcrumbShowcases')}
                </Link>
              </li>
              {category && categoryHref ? (
                <>
                  <li className="text-border">/</li>
                  <li>
                    <Link href={categoryHref} className="transition hover:text-foreground">
                      {category.title}
                    </Link>
                  </li>
                </>
              ) : null}
              <li className="text-border">/</li>
              <li className="truncate text-foreground">{video.title}</li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={backHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
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
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                {category.title}
              </Link>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-[28px] border border-border/70 bg-black shadow-lg">
            <video
              src={video.videoUrl}
              poster={getShowcaseVideoThumbnailUrl(video) || undefined}
              controls
              preload="metadata"
              playsInline
              className="aspect-video w-full bg-black object-contain"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('videoLabel')}
              </p>
              <h1 className="max-w-5xl text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-[2rem]">
                {video.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{publishedAt.toLocaleDateString(dateLocale)}</span>
                {category ? (
                  <>
                    <span className="text-border">•</span>
                    <span>{category.title}</span>
                  </>
                ) : null}
              </div>
            </div>

            <section className="rounded-[24px] border border-border/70 bg-card px-5 py-4 shadow-sm sm:px-6">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">
                {t('aboutTitle')}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span>
                  {t('publishedLabel')}: {publishedAt.toLocaleDateString(dateLocale)}
                </span>
                {category ? (
                  <span>
                    {t('categoryLabel')}: {category.title}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[15px]">
                {description}
              </p>
              {category && categoryHref ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  <Link href={categoryHref} className="font-medium text-primary transition hover:underline">
                    {t('exploreCategory', { category: category.title })}
                  </Link>
                </p>
              ) : null}
            </section>

            <div className="xl:hidden">
              <aside className="space-y-4">
                <div className="rounded-[24px] border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {t('relatedTitle')}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t('relatedDescription')}
                  </p>
                </div>

                {relatedVideos.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-border/70 bg-card/70 p-8 text-center text-sm text-muted-foreground">
                    {t('emptyRelatedVideos')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {relatedVideos.map((relatedVideo: ShowcaseVideo) => (
                      <Link
                        key={relatedVideo.id}
                        href={getShowcaseVideoWatchPath({ video: relatedVideo, locale })}
                        className="group flex gap-3 rounded-[20px] border border-border/70 bg-card p-2.5 transition hover:border-primary/40 hover:shadow-sm"
                      >
                        <div className="w-[44%] shrink-0">
                          <div className="relative aspect-video overflow-hidden rounded-[14px] bg-muted">
                            {relatedVideo.coverUrl ? (
                              <img
                                src={relatedVideo.coverUrl}
                                alt={relatedVideo.title}
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
                                <span className="text-2xl font-semibold text-foreground/70">
                                  {relatedVideo.title.slice(0, 1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 py-1">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                            {relatedVideo.title}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {getShowcaseVideoDescription(
                              relatedVideo,
                              t('descriptionFallback')
                            )}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {getShowcaseVideoPublishedAt(relatedVideo).toLocaleDateString(
                              dateLocale
                            )}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </aside>
            </div>

            <div className="rounded-[28px] border border-border/70 bg-card px-4 py-5 shadow-sm sm:px-6">
              <CommentSection pageId={commentsPageId} />
            </div>
          </div>
        </section>

        <aside className="hidden space-y-4 xl:sticky xl:top-28 xl:block xl:self-start">
          <div className="rounded-[24px] border border-border/70 bg-card px-4 py-4 shadow-sm sm:px-5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {t('relatedTitle')}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t('relatedDescription')}
            </p>
          </div>

          {relatedVideos.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/70 bg-card/70 p-8 text-center text-sm text-muted-foreground">
              {t('emptyRelatedVideos')}
            </div>
          ) : (
            <div className="space-y-3">
              {relatedVideos.map((relatedVideo: ShowcaseVideo) => (
                <Link
                  key={relatedVideo.id}
                  href={getShowcaseVideoWatchPath({ video: relatedVideo, locale })}
                  className="group flex gap-3 rounded-[20px] border border-border/70 bg-card p-2.5 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="w-[44%] shrink-0">
                    <div className="relative aspect-video overflow-hidden rounded-[14px] bg-muted">
                      {relatedVideo.coverUrl ? (
                        <img
                          src={relatedVideo.coverUrl}
                          alt={relatedVideo.title}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
                          <span className="text-2xl font-semibold text-foreground/70">
                            {relatedVideo.title.slice(0, 1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 py-1">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                      {relatedVideo.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {getShowcaseVideoDescription(
                        relatedVideo,
                        t('descriptionFallback')
                      )}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {getShowcaseVideoPublishedAt(relatedVideo).toLocaleDateString(
                        dateLocale
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
