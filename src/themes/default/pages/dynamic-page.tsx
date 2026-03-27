import { getThemeBlock } from '@/core/theme';
import { getConfigs } from '@/shared/models/config';
import { getShowcaseVideoWatchPath } from '@/shared/lib/showcase-video-url';
import {
  findPublishedShowcaseVideoById,
  findPublishedShowcaseVideoByVideoUrl,
} from '@/shared/models/showcase-video';
import type { DynamicPage as DynamicPageType } from '@/shared/types/blocks/landing';

export default async function DynamicPage({
  locale,
  page,
  data,
}: {
  locale?: string;
  page: DynamicPageType;
  data?: Record<string, any>;
}) {
  const configs = await getConfigs();

  return (
    <>
      {page.title && !page.sections?.hero && (
        <h1 className="sr-only">{page.title}</h1>
      )}
      {page?.sections &&
        Object.keys(page.sections).map(async (sectionKey: string) => {
          const section = page.sections?.[sectionKey];
          if (!section || section.disabled === true) {
            return null;
          }

          if (page.show_sections && !page.show_sections.includes(sectionKey)) {
            return null;
          }

          // block name
          const block = section.block || section.id || sectionKey;
          let resolvedSection = section;

          if (
            block === 'hero-lumen5' &&
            (section.featured_video?.src || configs.homepage_showcase_video_id)
          ) {
            const showcaseVideo =
              (configs.homepage_showcase_video_id
                ? await findPublishedShowcaseVideoById(
                    configs.homepage_showcase_video_id
                  )
                : null) ||
              (section.featured_video?.src
                ? await findPublishedShowcaseVideoByVideoUrl(
                    section.featured_video.src
                  )
                : null);

            if (showcaseVideo) {
              resolvedSection = {
                ...section,
                featured_image: showcaseVideo.coverUrl
                  ? {
                      ...(section.featured_image || {}),
                      src: showcaseVideo.coverUrl,
                      alt: showcaseVideo.title || section.featured_image?.alt,
                    }
                  : section.featured_image,
                featured_video: {
                  ...section.featured_video,
                  src: showcaseVideo.videoUrl,
                  poster:
                    showcaseVideo.coverUrl ||
                    section.featured_video?.poster ||
                    section.featured_image?.src,
                  watch_url: getShowcaseVideoWatchPath({ video: showcaseVideo }),
                  watch_label:
                    section.featured_video?.watch_label ||
                    'Watch video details',
                },
              };
            }
          }

          switch (block) {
            default:
              try {
                if (resolvedSection.component) {
                  return resolvedSection.component;
                }

                const DynamicBlock = await getThemeBlock(block);
                return (
                  <DynamicBlock
                    key={sectionKey}
                    section={resolvedSection}
                    {...(data || resolvedSection.data || {})}
                  />
                );
              } catch (error) {
                return null;
              }
          }
        })}
    </>
  );
}
