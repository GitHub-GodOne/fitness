import type { NextRequest } from 'next/server';

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

function getFirstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || null;
}

function getEffectiveRequestOrigin(request: NextRequest) {
  const forwardedHost = getFirstHeaderValue(
    request.headers.get('x-forwarded-host')
  );
  const forwardedProto = getFirstHeaderValue(
    request.headers.get('x-forwarded-proto')
  );
  const host = forwardedHost || request.headers.get('host') || request.nextUrl.host;
  const protocol =
    forwardedProto ||
    (host?.includes('localhost')
      ? 'http'
      : request.nextUrl.protocol.replace(/:$/, '') || 'https');

  return { host, protocol };
}

export function getCanonicalHostRedirectUrl(request: NextRequest) {
  try {
    const canonicalUrl = new URL(getConfiguredAppUrl());
    const incomingUrl = request.nextUrl.clone();
    const effectiveOrigin = getEffectiveRequestOrigin(request);

    const canonicalHostname = canonicalUrl.hostname;
    const incomingHostname = effectiveOrigin.host.split(':')[0];
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
      const canonicalProtocol = canonicalUrl.protocol.replace(/:$/, '');

      if (effectiveOrigin.protocol === canonicalProtocol) {
        return null;
      }
    }

    incomingUrl.protocol = canonicalUrl.protocol;
    incomingUrl.host = canonicalUrl.host;

    return incomingUrl.toString();
  } catch {
    return null;
  }
}
