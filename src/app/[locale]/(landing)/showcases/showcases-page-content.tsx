import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronRight, Search } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Input } from '@/shared/components/ui/input';
import {
  getShowcaseVideos,
  type ShowcaseVideo,
  ShowcaseVideoStatus,
} from '@/shared/models/showcase-video';
import {
  getTaxonomies,
  type Taxonomy,
  TaxonomyStatus,
  TaxonomyType,
} from '@/shared/models/taxonomy';

import { ShowcasesBackLink } from './showcases-back-link';
import { ShowcaseVideoGallery } from './showcase-video-gallery';

function getCategoryHref(item: { slug: string; targetUrl?: string | null }) {
  return item.targetUrl?.trim() || `/showcases/${item.slug}`;
}

export async function ShowcasesPageContent({
  locale,
  categorySlug,
  searchQuery,
}: {
  locale: string;
  categorySlug?: string;
  searchQuery?: string;
}) {
  const t = await getTranslations({ locale, namespace: 'pages.showcases.page' });

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

  const videos = await getShowcaseVideos({
    categoryId:
      activeCategory?.type === TaxonomyType.SHOWCASE_CATEGORY
        ? activeCategory.id
        : undefined,
    status: ShowcaseVideoStatus.PUBLISHED,
    limit: 60,
    getUser: true,
  });

  const heroImage =
    activeCategory?.image ||
    videos.find((item: ShowcaseVideo) => item.coverUrl)?.coverUrl ||
    categories.find((item: Taxonomy) => item.image)?.image ||
    null;

  const heroTitle = activeCategory ? activeCategory.title : t('defaultTitle');
  const heroDescription = activeCategory
    ? activeCategory.description || t('activeCategoryFallbackDescription')
    : t('defaultDescription');
  const normalizedSearchQuery = searchQuery?.trim().toLowerCase() || '';
  const filteredVideos = normalizedSearchQuery
    ? videos.filter((video: ShowcaseVideo) => {
        const haystack = `${video.title} ${video.description || ''}`.toLowerCase();
        return haystack.includes(normalizedSearchQuery);
      })
    : videos;
  const resetHref = categorySlug ? `/showcases/${categorySlug}` : '/showcases';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container pb-16 pt-24 lg:pt-28">
        <section className="overflow-hidden rounded-[26px] border border-border/70 bg-card shadow-lg sm:rounded-[32px]">
          <div className="relative aspect-[4/5] sm:aspect-[16/8] lg:aspect-[16/7]">
            {heroImage ? (
              <img
                src={heroImage}
                alt={heroTitle}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20" />
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-foreground/15 via-foreground/10 to-background/15" />
            <div className="absolute inset-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <h1 className="max-w-3xl font-serif text-[28px] leading-[0.95] tracking-[-0.04em] text-background drop-shadow-sm sm:text-[40px] lg:text-[48px]">
                  {heroTitle}
                </h1>
                <p className="mt-3 max-w-2xl text-[13px] font-medium leading-6 text-background/88 sm:text-[15px] lg:text-base">
                  {heroDescription}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {activeCategory ? (
                    <ShowcasesBackLink
                      href="/showcases"
                      className="inline-flex h-10 items-center justify-center rounded-full bg-background px-4 text-sm font-semibold text-primary transition hover:brightness-95 sm:h-11 sm:px-5"
                      ariaLabel={t('backToCategories')}
                      title={t('backToCategories')}
                    >
                      <ArrowLeft className="mr-2 size-4" />
                      {t('backToCategories')}
                    </ShowcasesBackLink>
                  ) : null}

                  <Link
                    href="/showcases/submit"
                    className="inline-flex h-10 items-center justify-center rounded-full bg-background px-4 text-sm font-semibold text-primary transition hover:brightness-95 sm:h-11 sm:px-5"
                  >
                    {t('submitCta')}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative bg-background/95 px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
            <div className="absolute left-0 right-0 top-0 h-7 bg-[radial-gradient(circle_at_center,var(--color-primary)/0.14_0%,transparent_68%)]" />

            {categories.length > 0 ? (
              <>
                <div className="mb-4 flex items-center gap-3 sm:mb-5">
                  <h2 className="text-[24px] font-bold tracking-[-0.03em] text-foreground sm:text-[32px]">
                    {t('categoriesTitle')}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                  {categories.map((item) => {
                    const isActive = activeCategory?.id === item.id;
                    const cardDescription =
                      item.description || t('cardDescriptionFallback');
                    return (
                      <Link
                        key={item.id}
                        href={getCategoryHref(item)}
                        title={`${item.title} - ${cardDescription}`}
                        aria-label={`${item.title}. ${cardDescription}`}
                        className={`overflow-hidden rounded-[18px] border bg-card shadow-sm transition ${
                          isActive
                            ? 'border-primary/60 ring-2 ring-primary/25'
                            : 'border-border/70 hover:border-primary/35 hover:shadow-md'
                        }`}
                      >
                        <div className="relative aspect-[4/5] sm:aspect-[5/4]">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15">
                              <span className="text-2xl font-semibold text-foreground/70">
                                {item.title.slice(0, 1)}
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4">
                            <h3 className="line-clamp-2 font-serif text-base leading-tight text-white sm:text-[24px] sm:leading-none">
                              {item.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-4 text-white/85 sm:mt-1.5 sm:text-[13px] sm:leading-normal">
                              {cardDescription}
                            </p>
                          </div>
                          <span className="sr-only">
                            {item.title}. {cardDescription}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : null}

            <div className="mt-5 border-t border-border/70 pt-4 sm:mt-6 sm:pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center text-[13px] font-semibold text-muted-foreground sm:text-left sm:text-sm">
                  <span>{t('sortRecent')}</span>
                  {activeCategory ? (
                    <>
                      <span className="mx-2 text-border">|</span>
                      <span>{activeCategory.title}</span>
                    </>
                  ) : null}
                </div>

                <form className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <div className="relative sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      name="q"
                      defaultValue={searchQuery}
                      placeholder={t('searchPlaceholder')}
                      className="h-10 rounded-full border-border/70 bg-card pl-9 pr-4 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 sm:justify-end">
                    <button
                      type="submit"
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-95"
                    >
                      {t('searchButton')}
                    </button>
                    {searchQuery ? (
                      <Link
                        href={resetHref}
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-border/70 px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                      >
                        {t('clearSearch')}
                      </Link>
                    ) : null}
                  </div>
                </form>
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <div className="mb-4 flex items-center gap-3 sm:mb-5">
                <h2 className="text-[28px] font-bold tracking-[-0.03em] text-foreground sm:text-[36px]">
                  {t('videosTitle')}
                </h2>
                <div className="h-px flex-1 bg-border" />
                <span className="shrink-0 text-xs font-medium text-muted-foreground sm:text-sm">
                  {filteredVideos.length}
                </span>
              </div>

              {filteredVideos.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border/70 bg-card/80 p-12 text-center text-muted-foreground">
                  {searchQuery ? t('emptySearchVideos') : t('emptyCategoryVideos')}
                </div>
              ) : (
                <ShowcaseVideoGallery
                  videos={filteredVideos}
                  locale={locale}
                />
              )}
            </div>

            <div className="mt-8 sm:mt-10">
              <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-primary via-primary/90 to-accent px-5 py-7 text-center shadow-lg sm:px-8 sm:py-8">
                <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(12deg,transparent_35%,rgba(255,255,255,0.45)_35%,rgba(255,255,255,0.45)_37%,transparent_37%,transparent_55%,rgba(255,255,255,0.22)_55%,rgba(255,255,255,0.22)_57%,transparent_57%)]" />
                <div className="relative">
                  <h3 className="font-serif text-[30px] leading-none text-primary-foreground sm:text-[42px]">
                    {t('submitBannerTitle')}
                  </h3>
                  <div className="mx-auto mt-3 h-px w-full max-w-md bg-primary-foreground/40" />
                  <p className="mt-3 text-base font-semibold text-primary-foreground/95 sm:text-2xl">
                    {t('submitBannerDescription')}
                  </p>
                  <Link
                    href="/showcases/submit"
                    className="mt-5 inline-flex items-center rounded-xl bg-background px-8 py-3 text-base font-bold text-primary shadow-md transition hover:brightness-95 sm:px-10 sm:text-lg"
                  >
                    {t('submitBannerCta')}
                    <ChevronRight className="ml-2 size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
