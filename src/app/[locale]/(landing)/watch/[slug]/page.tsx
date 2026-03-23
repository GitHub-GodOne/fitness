import { ArrowLeft, ArrowRight } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getHomeHeroWatchPageBySlug } from '@/shared/lib/home-hero-watch-page';
import { toPublicAbsoluteUrl } from '@/shared/lib/showcase-video-seo';

export const revalidate = 3600;

function toUploadDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: `watch/${slug}`,
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  const watchPage = getHomeHeroWatchPageBySlug(locale, slug);
  if (!watchPage) {
    return {};
  }

  const canonical = toPublicAbsoluteUrl(watchPage.url);
  const thumbnailUrl = toPublicAbsoluteUrl(watchPage.videoPoster || envConfigs.app_preview_image);

  return {
    title: watchPage.title,
    description: watchPage.description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'video.other',
      locale,
      url: canonical,
      title: watchPage.title,
      description: watchPage.description,
      images: thumbnailUrl ? [{ url: thumbnailUrl }] : undefined,
      videos: watchPage.videoSrc
        ? [
            {
              url: watchPage.videoSrc,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: watchPage.title,
      description: watchPage.description,
      images: thumbnailUrl ? [thumbnailUrl] : undefined,
    },
  };
}

export default async function HomeHeroWatchPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: `watch/${slug}`,
    locale,
    canonicalPath: `/watch/${slug}`,
  });

  if (customHtmlMetadata) {
    return customHtmlMetadata;
  }

  const watchPage = getHomeHeroWatchPageBySlug(locale, slug);
  if (!watchPage) {
    notFound();
  }

  const uploadDate = toUploadDate(watchPage.uploadDate);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: watchPage.title,
    description: watchPage.description,
    thumbnailUrl: toPublicAbsoluteUrl(
      watchPage.videoPoster || envConfigs.app_preview_image
    ),
    uploadDate: uploadDate?.toISOString(),
    contentUrl: toPublicAbsoluteUrl(watchPage.videoSrc),
    embedUrl: toPublicAbsoluteUrl(watchPage.url),
    url: toPublicAbsoluteUrl(watchPage.url),
    inLanguage: locale,
    isFamilyFriendly: true,
  };

  const homeHref = locale === defaultLocale ? '/' : `/${locale}`;

  return (
    <div className="container pb-16 pt-24 lg:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="mx-auto max-w-5xl space-y-10">
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href={homeHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {watchPage.backTitle}
            </Link>

            {watchPage.ctaTitle && watchPage.ctaUrl ? (
              <Link
                href={watchPage.ctaUrl}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <span>{watchPage.ctaTitle}</span>
                <ArrowRight className="size-4" />
              </Link>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {watchPage.videoLabel}
            </p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {watchPage.title}
            </h1>
            {uploadDate ? (
              <div className="text-sm text-muted-foreground">
                {uploadDate.toLocaleDateString(locale)}
              </div>
            ) : null}
            <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {watchPage.description}
            </p>
          </div>
        </section>

        <section>
          <div className="overflow-hidden rounded-3xl border bg-black shadow-sm">
            <video
              src={watchPage.videoSrc}
              poster={watchPage.videoPoster || undefined}
              controls
              preload="metadata"
              playsInline
              className="aspect-video w-full bg-black object-contain"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
