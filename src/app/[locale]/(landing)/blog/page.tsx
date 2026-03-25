import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getPostsAndCategories } from '@/shared/models/post';
import {
  Category as CategoryType,
  Post as PostType,
} from '@/shared/types/blocks/blog';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

const getDefaultMetadata = getMetadata({
  metadataKey: 'pages.blog.metadata',
  canonicalUrl: '/blog',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: 'blog',
    locale,
    canonicalPath: '/blog',
  });

  return customHtmlMetadata ?? getDefaultMetadata({ params });
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: 'blog',
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  // load blog data
  const t = await getTranslations('pages.blog');
  const seoParagraphs = t.raw('seo.paragraphs') as string[];

  let posts: PostType[] = [];
  let categories: CategoryType[] = [];

  // current category data
  const currentCategory: CategoryType = {
    id: 'all',
    slug: 'all',
    title: t('messages.all'),
    url: `/blog`,
  };

  try {
    const { page: pageNum, pageSize } = await searchParams;
    const page = pageNum || 1;
    const limit = pageSize || 30;

    const { posts: allPosts, categories: allCategories } =
      await getPostsAndCategories({
        locale,
        page,
        limit,
      });

    posts = allPosts;
    categories = allCategories;

    categories.unshift(currentCategory);
  } catch (error) {
    console.log('getting posts failed:', error);
  }

  // build page sections
  const page: DynamicPage = {
    title: t('page.title'),
    sections: {
      blog: {
        ...t.raw('page.sections.blog'),
        data: {
          categories,
          currentCategory,
          posts,
        },
      },
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return (
    <>
      <Page locale={locale} page={page} />
      <section className="container pb-16 pt-4 sm:pt-6">
        <div className="mx-auto max-w-4xl rounded-[24px] border border-border/70 bg-card/70 px-5 py-6 shadow-sm sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('seo.title')}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            <p>
              {t('seo.listCountsParagraph', {
                postCount: posts.length,
                categoryCount: Math.max(categories.length - 1, 0),
              })}
            </p>
            {seoParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
