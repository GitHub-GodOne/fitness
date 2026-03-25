import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { Empty } from '@/shared/blocks/common';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { buildSeoTitle, getLocaleAlternates } from '@/shared/lib/seo';
import { getPost } from '@/shared/models/post';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.blog.metadata' });
  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: `blog/${slug}`,
    locale,
    canonicalPath: `/blog/${slug}`,
  });

  if (customHtmlMetadata) {
    return customHtmlMetadata;
  }

  const alternates = await getLocaleAlternates(`/blog/${slug}`, locale);
  const localeSuffix = t('detailDescriptionSuffix');

  const post = await getPost({ slug, locale });
  if (!post) {
    return {
      title: buildSeoTitle(`${slug} | ${t('title')}`),
      description: t('description'),
      alternates,
    };
  }

  return {
    title: buildSeoTitle(`${post.title} | ${t('title')}`),
    description: [post.description, localeSuffix].filter(Boolean).join(' '),
    alternates,
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: `blog/${slug}`,
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  const post = await getPost({ slug, locale });
  const t = await getTranslations({ locale, namespace: 'pages.blog' });

  if (!post) {
    return <Empty message={`Post not found`} />;
  }

  // build page sections
  const page: DynamicPage = {
    sections: {
      blogDetail: {
        block: 'blog-detail',
        data: {
          post,
        },
      },
    },
  };

  const Page = await getThemePage('dynamic-page');

  return (
    <>
      <Page locale={locale} page={page} />
      <section className="container pb-16 pt-0 sm:pb-20">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-border/70 bg-card/70 px-5 py-6 shadow-sm sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('seo.detailTitle')}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {post.description ? <p>{post.description}</p> : null}
            {(t.raw('seo.detailParagraphs') as string[]).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
