'use client';

import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  getShowcaseVideoWatchPath,
} from '@/shared/lib/showcase-video-url';

type ShowcaseVideoCard = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  coverUrl: string | null;
  createdAt: Date;
  publishedAt: Date | null;
};

export function ShowcaseVideoGallery({
  videos,
  locale,
}: {
  videos: ShowcaseVideoCard[];
  locale: string;
}) {
  const t = useTranslations('pages.showcases.page.gallery');
  const dateLocale = t('dateLocale');

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {videos.map((video) => {
        const videoDescription = video.description || t('descriptionFallback');
        return (
        <Link
          key={video.id}
          href={getShowcaseVideoWatchPath({ video, locale })}
          title={`${video.title} - ${videoDescription}`}
          aria-label={`${video.title}. ${videoDescription}`}
          className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-border/70 bg-card text-left shadow-sm transition hover:border-primary/35 hover:shadow-md"
        >
          <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-muted">
            {video.coverUrl ? (
              <>
                <Skeleton className="absolute inset-0 rounded-none" />
                <img
                  src={video.coverUrl}
                  alt={video.title}
                  loading="lazy"
                  className="relative z-10 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
                <span className="text-3xl font-semibold text-foreground/70">
                  {video.title.slice(0, 1)}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/20 via-transparent to-transparent" />
            <div className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-background/80 bg-background/20 text-background backdrop-blur-sm sm:h-14 sm:w-14">
              <Play className="ml-0.5 size-5 fill-current sm:size-6" />
            </div>
          </div>

          <div className="flex min-h-[140px] flex-1 flex-col px-4 py-3.5 sm:min-h-[148px] sm:px-4 sm:py-4">
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <h2 className="min-h-[3.2rem] line-clamp-2 text-[18px] font-bold leading-tight text-foreground sm:min-h-[3.35rem] sm:text-[19px]">
                {video.title}
              </h2>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(video.publishedAt || video.createdAt).toLocaleDateString(
                  dateLocale
                )}
              </span>
            </div>
            <p className="min-h-[4.5rem] line-clamp-3 text-[14px] leading-6 text-muted-foreground">
              {videoDescription}
            </p>
          </div>
          <span className="sr-only">
            {video.title}. {videoDescription}
          </span>
        </Link>
      )})}
    </div>
  );
}
