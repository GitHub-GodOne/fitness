const DEFAULT_APP_URL = 'http://localhost:3000';

function getConfiguredAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || DEFAULT_APP_URL).replace(/\/$/, '');
}

export function getCanonicalSiteOrigin() {
  const appUrl = getConfiguredAppUrl();

  try {
    return new URL(appUrl).origin;
  } catch {
    return appUrl;
  }
}

export function buildAbsoluteSiteUrl(pathname: string) {
  const origin = getCanonicalSiteOrigin();

  if (!pathname || pathname === '/') {
    return origin;
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${origin}${normalizedPath}`;
}

export function getCanonicalHostRedirectUrl(requestUrl: string) {
  try {
    const canonicalUrl = new URL(getConfiguredAppUrl());
    const incomingUrl = new URL(requestUrl);

    const canonicalHostname = canonicalUrl.hostname;
    const incomingHostname = incomingUrl.hostname;
    const canonicalApexHostname = canonicalHostname.startsWith('www.')
      ? canonicalHostname.slice(4)
      : canonicalHostname;
    const incomingApexHostname = incomingHostname.startsWith('www.')
      ? incomingHostname.slice(4)
      : incomingHostname;

    if (canonicalApexHostname !== incomingApexHostname) {
      return null;
    }

    if (canonicalHostname === incomingHostname) {
      return null;
    }

    incomingUrl.protocol = canonicalUrl.protocol;
    incomingUrl.host = canonicalUrl.host;

    return incomingUrl.toString();
  } catch {
    return null;
  }
}
