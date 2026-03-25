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
  const t = await getTranslations('pages.blog.metadata');
  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: `blog/${slug}`,
    locale,
    canonicalPath: `/blog/${slug}`,
  });

  if (customHtmlMetadata) {
    return customHtmlMetadata;
  }

  const alternates = getLocaleAlternates(`/blog/${slug}`, locale);

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
    description: post.description,
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

  return <Page locale={locale} page={page} />;
}
