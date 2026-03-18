'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import type { ShowcaseVideo } from '@/shared/models/showcase-video';

export function ShowcaseVideoGallery({
  videos,
  locale,
}: {
  videos: ShowcaseVideo[];
  locale: string;
}) {
  const t = useTranslations('pages.showcases.page.gallery');
  const [activeVideo, setActiveVideo] = useState<ShowcaseVideo | null>(null);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {videos.map((video) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setActiveVideo(video)}
            className="group flex h-full flex-col overflow-hidden rounded-3xl border bg-card text-left transition hover:border-primary/40 hover:shadow-sm"
          >
            <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-muted">
              <video
                src={video.videoUrl}
                poster={video.coverUrl || undefined}
                preload="metadata"
                muted
                playsInline
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </div>

            <div className="flex flex-1 flex-col space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold text-foreground">
                  {video.title}
                </h2>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(video.publishedAt || video.createdAt).toLocaleDateString(
                    locale === 'zh' ? 'zh-CN' : 'en-US'
                  )}
                </span>
              </div>
              <p className="line-clamp-3 min-h-[3.75rem] text-sm text-muted-foreground">
                {video.description || t('descriptionFallback')}
              </p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={Boolean(activeVideo)} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent
          showCloseButton={false}
          className="h-screen w-screen max-w-screen translate-x-[-50%] translate-y-[-50%] rounded-none border-0 bg-black p-0 sm:max-w-screen"
        >
          {activeVideo ? (
            <div className="relative h-full overflow-hidden bg-black">
              <div className="sr-only">
                <DialogTitle>{activeVideo.title}</DialogTitle>
                <DialogDescription>
                  {activeVideo.description || activeVideo.title}
                </DialogDescription>
              </div>

              <DialogClose className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-6 sm:top-6">
                <X className="size-5" />
                <span className="sr-only">{t('closeVideo')}</span>
              </DialogClose>

              <video
                src={activeVideo.videoUrl}
                poster={activeVideo.coverUrl || undefined}
                controls
                autoPlay
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full bg-black object-contain"
              />

              {/* Keep the playback surface clean; only show native controls. */}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
