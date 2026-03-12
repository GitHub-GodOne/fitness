import { setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { getMetadata } from '@/shared/lib/seo';
import { getConfigs } from '@/shared/models/config';
import {
  getShowcaseVideos,
  ShowcaseVideoStatus,
} from '@/shared/models/showcase-video';
import { getTaxonomies, TaxonomyStatus, TaxonomyType } from '@/shared/models/taxonomy';

import { ShowcaseVideoGallery } from './showcase-video-gallery';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.showcases.metadata',
  canonicalUrl: '/showcases',
});

export default async function ShowcasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const { locale } = await params;
  const { category } = await searchParams;
  const isZh = locale === 'zh';
  setRequestLocale(locale);
  const configs = await getConfigs();
  const showcaseDisplayMode =
    configs.showcases_display_mode === 'cards' ? 'cards' : 'tabs';

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });

  const activeCategory = category
    ? categories.find((item) => item.slug === category)
    : undefined;

  const shouldShowVideoList =
    showcaseDisplayMode === 'tabs' || Boolean(activeCategory);

  const videos = shouldShowVideoList
    ? await getShowcaseVideos({
        categoryId:
          activeCategory?.type === TaxonomyType.SHOWCASE_CATEGORY
            ? activeCategory.id
            : undefined,
        status: ShowcaseVideoStatus.PUBLISHED,
        limit: 60,
        getUser: true,
      })
    : [];

  return (
    <div className="container pb-16 pt-24 lg:pt-28">
      <div className="space-y-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {showcaseDisplayMode === 'cards' && activeCategory ? (
              <Link
                href="/showcases"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                aria-label={isZh ? '返回分类列表' : 'Back to categories'}
                title={isZh ? '返回分类列表' : 'Back to categories'}
              >
                <ArrowLeft className="size-4" />
              </Link>
            ) : (
              <div />
            )}

            <Link
              href="/showcases/submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
            >
              {isZh ? '投稿我的视频' : 'Submit My Video'}
            </Link>
          </div>

          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {activeCategory
                ? activeCategory.title
                : isZh
                  ? '看看大家创作出的温暖视频'
                  : 'See the videos people created from the heart'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {activeCategory
                ? activeCategory.description ||
                  (isZh
                    ? '浏览这个分类下已经发布的视频作品。'
                    : 'Browse the published videos in this category.')
                : isZh
                  ? '这里收录了用户投稿并通过审核的视频作品。你可以按分类慢慢浏览，看看不同主题下的真实创作。'
                  : 'This is a curated space for approved community submissions. Browse by category and explore the videos people have already created.'}
            </p>
          </div>
        </section>

        {showcaseDisplayMode === 'tabs' ? (
          <section className="flex flex-wrap gap-3">
            <Link
              href="/showcases"
              className={`rounded-full border px-4 py-2 text-sm transition ${
                !activeCategory
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {isZh ? '全部' : 'All'}
            </Link>
            {categories.map((item) => {
              const isActive = activeCategory?.id === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/showcases?category=${item.slug}`}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.title}
                </Link>
              );
            })}
          </section>
        ) : null}

        {showcaseDisplayMode === 'cards' && !activeCategory ? (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((item) => (
              <Link
                key={item.id}
                href={`/showcases?category=${item.slug}`}
                className="group overflow-hidden rounded-3xl border bg-card transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="relative aspect-[16/10] bg-muted">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
                      <span className="text-2xl font-semibold text-foreground/70">
                        {item.title.slice(0, 1)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">{item.title}</h2>
                    <span className="text-xs text-muted-foreground">
                      {isZh ? '进入分类' : 'Open'}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {item.description ||
                      (isZh
                        ? '点击查看这个分类下已发布的视频案例。'
                        : 'Open this category to browse published showcase videos.')}
                  </p>
                </div>
              </Link>
            ))}
          </section>
        ) : null}

        {shouldShowVideoList ? (
        <section>
          {videos.length === 0 ? (
            <div className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
              {isZh
                ? '该分类下还没有已发布的视频。'
                : 'No published videos are available in this category yet.'}
            </div>
          ) : (
            <ShowcaseVideoGallery videos={videos} locale={locale} isZh={isZh} />
          )}
        </section>
        ) : null}
      </div>
    </div>
  );
}
