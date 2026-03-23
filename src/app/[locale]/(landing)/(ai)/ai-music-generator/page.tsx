import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { MusicGenerator } from '@/shared/blocks/generator';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

const getDefaultMetadata = getMetadata({
  metadataKey: 'ai.music.metadata',
  canonicalUrl: '/ai-music-generator',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: 'ai-music-generator',
    locale,
    canonicalPath: '/ai-music-generator',
  });

  return customHtmlMetadata ?? getDefaultMetadata({ params });
}

export default async function AiMusicGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: 'ai-music-generator',
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  // get ai music data
  const t = await getTranslations('ai.music');

  // build page sections
  const page: DynamicPage = {
    sections: {
      hero: {
        title: t.raw('page.title'),
        description: t.raw('page.description'),
        background_image: {
          src: '/imgs/bg/tree.jpg',
          alt: 'hero background',
        },
      },
      generator: {
        component: <MusicGenerator srOnlyTitle={t.raw('generator.title')} />,
      },
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
