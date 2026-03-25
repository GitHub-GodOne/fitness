import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';

export function buildSeoTitle(title?: string, appName?: string) {
  const baseTitle = String(title || '').trim();
  const resolvedAppName = String(appName || envConfigs.app_name || '').trim();

  if (!baseTitle) {
    return resolvedAppName;
  }

  if (!resolvedAppName) {
    return baseTitle;
  }

  if (baseTitle.toLowerCase().includes(resolvedAppName.toLowerCase())) {
    return baseTitle;
  }

  return `${baseTitle} | ${resolvedAppName}`;
}

function normalizeAppPath(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const trimmed = pathname.startsWith('/') ? pathname : `/${pathname}`;
  for (const locale of locales) {
    if (locale === defaultLocale) {
      continue;
    }

    if (trimmed === `/${locale}`) {
      return '/';
    }

    if (trimmed.startsWith(`/${locale}/`)) {
      return trimmed.slice(locale.length + 1);
    }
  }

  return trimmed;
}

function toAppRelativePath(canonicalUrl: string) {
  if (!canonicalUrl) {
    return '/';
  }

  if (!canonicalUrl.startsWith('http')) {
    return normalizeAppPath(canonicalUrl);
  }

  try {
    const targetUrl = new URL(canonicalUrl);
    return normalizeAppPath(targetUrl.pathname);
  } catch {
    return null;
  }
}

async function getRequestOrigin() {
  const fallbackOrigin = envConfigs.app_url.replace(/\/$/, '');

  try {
    const requestHeaders = await headers();
    const forwardedHost =
      requestHeaders.get('x-forwarded-host') || requestHeaders.get('host');
    const forwardedProto =
      requestHeaders.get('x-forwarded-proto') ||
      (forwardedHost?.includes('localhost') ? 'http' : 'https');

    if (!forwardedHost) {
      return fallbackOrigin;
    }

    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '');
  } catch {
    return fallbackOrigin;
  }
}

export async function buildCanonicalUrl(canonicalUrl: string, locale: string) {
  let resolvedCanonicalUrl = canonicalUrl || '/';
  const requestOrigin = await getRequestOrigin();

  if (resolvedCanonicalUrl.startsWith('http')) {
    try {
      const targetUrl = new URL(resolvedCanonicalUrl);
      const normalizedPath = normalizeAppPath(targetUrl.pathname);
      const localePrefix = !locale || locale === defaultLocale ? '' : `/${locale}`;

      if (normalizedPath === '/') {
        return `${requestOrigin}${localePrefix || ''}`;
      }

      return `${requestOrigin}${localePrefix}${normalizedPath}`;
    } catch {
      return resolvedCanonicalUrl;
    }
  }

  if (!resolvedCanonicalUrl.startsWith('/')) {
    resolvedCanonicalUrl = `/${resolvedCanonicalUrl}`;
  }

  const normalizedPath = normalizeAppPath(resolvedCanonicalUrl);
  const localePrefix = !locale || locale === defaultLocale ? '' : `/${locale}`;

  if (normalizedPath === '/') {
    return `${requestOrigin}${localePrefix || ''}`;
  }

  return `${requestOrigin}${localePrefix}${normalizedPath}`;
}

export async function getLocaleAlternates(canonicalUrl: string, locale: string) {
  const canonical = await buildCanonicalUrl(canonicalUrl, locale);
  const relativePath = toAppRelativePath(canonicalUrl);

  if (!relativePath) {
    return { canonical };
  }

  const localizedUrls = await Promise.all(
    locales.map(async (item) => [item, await buildCanonicalUrl(relativePath, item)] as const)
  );
  const languages = Object.fromEntries(localizedUrls) as Record<string, string>;

  languages['x-default'] = await buildCanonicalUrl(relativePath, defaultLocale);

  return {
    canonical,
    languages,
  };
}

// get metadata for page component
export function getMetadata(
  options: {
    title?: string;
    description?: string;
    keywords?: string;
    metadataKey?: string;
    canonicalUrl?: string; // relative path or full url
    imageUrl?: string;
    appName?: string;
    noIndex?: boolean;
  } = {}
) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);

    // passed metadata
    const passedMetadata = {
      title: options.title,
      description: options.description,
      keywords: options.keywords,
    };

    // default metadata
    const defaultMetadata = await getTranslatedMetadata(
      defaultMetadataKey,
      locale
    );

    // translated metadata
    let translatedMetadata: any = {};
    if (options.metadataKey) {
      translatedMetadata = await getTranslatedMetadata(
        options.metadataKey,
        locale
      );
    }

    // canonical url
    const alternates = await getLocaleAlternates(options.canonicalUrl || '/', locale || '');

    const title = buildSeoTitle(
      passedMetadata.title || translatedMetadata.title || defaultMetadata.title
    );
    const description =
      passedMetadata.description ||
      translatedMetadata.description ||
      defaultMetadata.description;

    // image url
    let imageUrl = options.imageUrl || envConfigs.app_preview_image;
    if (imageUrl.startsWith('http')) {
      imageUrl = imageUrl;
    } else {
      imageUrl = `${envConfigs.app_url}${imageUrl}`;
    }

    // app name
    let appName = options.appName;
    if (!appName) {
      appName = envConfigs.app_name || '';
    }

    return {
      title,
      description:
        passedMetadata.description ||
        translatedMetadata.description ||
        defaultMetadata.description,
      keywords:
        passedMetadata.keywords ||
        translatedMetadata.keywords ||
        defaultMetadata.keywords,
      alternates,

      openGraph: {
        type: 'website',
        locale: locale,
        url: alternates.canonical,
        title,
        description,
        siteName: appName,
        images: [imageUrl.toString()],
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl.toString()],
        site: envConfigs.app_url,
      },

      robots: {
        index: options.noIndex ? false : true,
        follow: options.noIndex ? false : true,
      },
    };
  };
}

const defaultMetadataKey = 'common.metadata';

async function getTranslatedMetadata(metadataKey: string, locale: string) {
  setRequestLocale(locale);
  const t = await getTranslations(metadataKey);

  return {
    title: t.has('title') ? t('title') : '',
    description: t.has('description') ? t('description') : '',
    keywords: t.has('keywords') ? t('keywords') : '',
  };
}
