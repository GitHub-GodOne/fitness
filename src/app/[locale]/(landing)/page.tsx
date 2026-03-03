import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';

import { getThemePage } from '@/core/theme';
import { DynamicPage } from '@/shared/types/blocks/landing';
import { envConfigs } from '@/config';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const appUrl = envConfigs.app_url || '';
  const canonicalUrl = locale === 'en' ? appUrl : `${appUrl}/${locale}`;

  return {
    title: 'Desk Stretches & Instant Pain Relief | OfficeReliefAI',
    description: 'Stiff neck or lower back pain from sitting all day? Turn your desk into a relief station. OfficeReliefAI builds instant, 3-minute custom stretches. No sweat needed.',
    keywords: 'desk stretches, office pain relief, lower back pain, neck pain, sitting pain, desk exercises, office stretches, 3-minute stretches, custom stretches, pain relief',
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: locale,
      url: canonicalUrl,
      title: 'Relieve Desk Tension in 3 Minutes | OfficeReliefAI',
      description: 'Say goodbye to lower back pain. Get a personalized stretch routine you can do right at your desk without breaking a sweat.',
      siteName: 'OfficeReliefAI',
      images: [
        {
          url: `${appUrl}${envConfigs.app_preview_image || '/og-image.png'}`,
          width: 1200,
          height: 630,
          alt: 'OfficeReliefAI - Desk Stretches & Pain Relief',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Relieve Desk Tension in 3 Minutes | OfficeReliefAI',
      description: 'Say goodbye to lower back pain. Get a personalized stretch routine you can do right at your desk without breaking a sweat.',
      images: [`${appUrl}${envConfigs.app_preview_image || '/og-image.png'}`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.index');

  // get page data
  const page: DynamicPage = t.raw('page');

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
