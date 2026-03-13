import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { getConfigs } from '@/shared/models/config';
import {
  getShowcaseVideos,
  ShowcaseVideoStatus,
} from '@/shared/models/showcase-video';
import { getTaxonomies, TaxonomyStatus, TaxonomyType } from '@/shared/models/taxonomy';

import { ShowcaseVideoGallery } from './showcase-video-gallery';

export async function ShowcasesPageContent({
  locale,
  categorySlug,
}: {
  locale: string;
  categorySlug?: string;
}) {
  const t = await getTranslations({ locale, namespace: 'pages.showcases.page' });
  const configs = await getConfigs();
  const showcaseDisplayMode =
    configs.showcases_display_mode === 'cards' ? 'cards' : 'tabs';

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });

  const activeCategory = categorySlug
    ? categories.find((item) => item.slug === categorySlug)
    : undefined;

  if (categorySlug && !activeCategory) {
    notFound();
  }

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
                aria-label={t('backToCategories')}
                title={t('backToCategories')}
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
              {t('submitCta')}
            </Link>
          </div>

          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {activeCategory
                ? activeCategory.title
                : t('defaultTitle')}
            </h1>
            <p className="text-muted-foreground text-lg">
              {activeCategory
                ? activeCategory.description || t('activeCategoryFallbackDescription')
                : t('defaultDescription')}
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
              {t('all')}
            </Link>
            {categories.map((item) => {
              const isActive = activeCategory?.id === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/showcases/${item.slug}`}
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
                href={`/showcases/${item.slug}`}
                className="group overflow-hidden rounded-3xl border bg-card transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="relative aspect-[16/10] bg-muted">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
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
                    <h2 className="text-xl font-semibold text-foreground">{item.title}</h2>
                    <span className="text-xs text-muted-foreground">{t('cardOpen')}</span>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {item.description || t('cardDescriptionFallback')}
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
                {t('emptyCategoryVideos')}
              </div>
            ) : (
              <ShowcaseVideoGallery videos={videos} locale={locale} />
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
