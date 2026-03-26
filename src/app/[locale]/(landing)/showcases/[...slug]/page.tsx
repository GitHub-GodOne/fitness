import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { buildSeoTitle, getLocaleAlternates } from '@/shared/lib/seo';
import {
  getTaxonomies,
  TaxonomyStatus,
  TaxonomyType,
} from '@/shared/models/taxonomy';

import { ShowcasesPageContent } from '../showcases-page-content';

export const revalidate = 3600;

function parseSeoKeywords(value?: string | null) {
  return String(value || '')
    .split(/[\n,，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const categorySlug = Array.isArray(slug) ? slug.join('/') : slug;
  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: `showcases/${categorySlug}`,
    locale,
    canonicalPath: `/showcases/${categorySlug}`,
  });

  if (customHtmlMetadata) {
    return customHtmlMetadata;
  }

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });
  const t = await getTranslations({ locale, namespace: 'pages.showcases.metadata' });

  const category = categories.find((item) => item.slug === categorySlug);
  const title = category?.title || 'Showcases';
  const description = category
    ? t('categoryDescriptionTemplate', { title: category.title })
    : t('defaultCategoryDescription');
  const keywords = category
    ? Array.from(
        new Set([
          category.title,
          category.slug,
          ...parseSeoKeywords(category.seoKeywords),
        ])
      )
    : undefined;
  const alternates = await getLocaleAlternates(`/showcases/${categorySlug}`, locale);

  return {
    title: buildSeoTitle(`${title} | Showcases`),
    description,
    keywords,
    alternates,
    openGraph: {
      type: 'website',
      locale,
      url: alternates.canonical,
      title: buildSeoTitle(`${title} | Showcases`),
      description,
    },
  };
}

export default async function ShowcaseCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale, slug } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);

  const categorySlug = Array.isArray(slug) ? slug.join('/') : slug;
  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: `showcases/${categorySlug}`,
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  const categories = await getTaxonomies({
    type: TaxonomyType.SHOWCASE_CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    limit: 100,
  });
  const category = categories.find((item) => item.slug === categorySlug);
  const seoT = await getTranslations({ locale, namespace: 'pages.showcases.seo' });
  const pageT = await getTranslations({ locale, namespace: 'pages.showcases.page' });
  const seoParagraphs = seoT.raw('paragraphs') as string[];
  const categoryDescription =
    category?.description || pageT('activeCategoryFallbackDescription');

  return (
    <>
      <ShowcasesPageContent
        locale={locale}
        categorySlug={categorySlug}
        searchQuery={q}
      />
      <section className="container pb-16 pt-6 sm:pt-8">
        <div className="mx-auto max-w-4xl rounded-[24px] border border-border/70 bg-card/70 px-5 py-6 shadow-sm sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {seoT('title')}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {category ? (
              <p>
                {category.title}. {categoryDescription}
              </p>
            ) : null}
            {seoParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
