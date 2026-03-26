import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { getThemePage } from '@/core/theme';
import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getMetadata } from '@/shared/lib/seo';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

const getDefaultMetadata = getMetadata({
  metadataKey: 'pages.pricing.metadata',
  canonicalUrl: '/pricing',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: 'pricing',
    locale,
    canonicalPath: '/pricing',
  });

  return customHtmlMetadata ?? getDefaultMetadata({ params });
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: 'pricing',
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  // get current subscription
  let currentSubscription;
  try {
    const user = await getUserInfo();
    if (user) {
      currentSubscription = await getCurrentSubscription(user.id);
    }
  } catch (error) {
    console.log('getting current subscription failed:', error);
  }

  // get pricing data
  const t = await getTranslations('pages.pricing');
  const getRawOrDefault = <T,>(key: string, fallback: T): T => {
    try {
      return t.raw(key) as T;
    } catch {
      return fallback;
    }
  };
  const pricingSection = t.raw('page.sections.pricing');
  const comparisonSection = getRawOrDefault('page.seo.comparison', {
    eyebrow: '',
    title: '',
    description: '',
    items: [],
  });
  const faqSection = getRawOrDefault('page.seo.faq', {
    eyebrow: '',
    title: '',
    description: '',
    items: [],
  });
  const canonicalUrl = `${envConfigs.app_url}${
    locale === defaultLocale ? '' : `/${locale}`
  }/pricing`;
  const offers = (pricingSection.items || []).map((item: any, index: number) => ({
    '@type': 'Offer',
    position: index + 1,
    sku: item.product_id,
    name: item.product_name || item.title,
    description: item.description || pricingSection.description,
    priceCurrency: item.currency,
    price: Number((item.amount || 0) / 100).toFixed(2),
    category: 'AI fitness video subscription',
    availability: 'https://schema.org/InStock',
    url: canonicalUrl,
  }));
  const offerCatalogSchema = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: pricingSection.title || t('page.title'),
    description: pricingSection.description,
    url: canonicalUrl,
    itemListElement: offers,
  };
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t('page.title'),
    description: pricingSection.description,
    provider: {
      '@type': 'Organization',
      name: envConfigs.app_name,
      url: envConfigs.app_url,
    },
    offers,
    areaServed: 'Worldwide',
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: envConfigs.app_name,
        item: `${envConfigs.app_url}${locale === defaultLocale ? '' : `/${locale}`}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pricingSection.title || t('page.title'),
        item: canonicalUrl,
      },
    ],
  };
  const faqItems = Array.isArray(faqSection?.items) ? faqSection.items : [];
  const comparisonItems = Array.isArray(comparisonSection?.items)
    ? comparisonSection.items
    : [];
  const planSummary = (pricingSection.items || [])
    .map((item: any) => item.title)
    .filter(Boolean)
    .join(', ');
  const faqSchema = faqItems.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item: any) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  // build page sections
  const page: DynamicPage = {
    title: t.raw('page.title'),
    sections: {
      pricing: {
        ...pricingSection,
        data: {
          currentSubscription,
        },
      },
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerCatalogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}
      <Page locale={locale} page={page} />
      <section className="container pb-16 pt-8 sm:pt-10">
        <div className="rounded-[28px] border border-border/70 bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {comparisonSection.eyebrow}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {comparisonSection.title}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                  {comparisonSection.description}
                </p>
              </div>
              <div className="space-y-3">
                {comparisonItems.map((item: any) => (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-border/70 bg-background/70 px-4 py-4"
                  >
                    <h3 className="text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {faqSection.eyebrow}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {faqSection.title}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                  {faqSection.description}
                </p>
              </div>
              <div className="space-y-3">
                {faqItems.map((item: any) => (
                  <div
                    key={item.question}
                    className="rounded-[22px] border border-border/70 bg-background/70 px-4 py-4"
                  >
                    <h3 className="text-base font-semibold text-foreground">
                      {item.question}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>
      <section className="container pb-16 pt-0">
        <div className="rounded-[28px] border border-border/70 bg-card/70 px-5 py-6 shadow-sm sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('messages.seo_body_title')}
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {planSummary ? (
              <p>{t('messages.seo_plan_summary', { plans: planSummary })}</p>
            ) : null}
            {(t.raw('messages.seo_body_paragraphs') as string[]).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
