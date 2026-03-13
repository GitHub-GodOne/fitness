export function normalizeGuestAccessPath(value?: string | null) {
  if (!value) {
    return '';
  }

  let normalized = value.trim();
  if (!normalized) {
    return '';
  }

  normalized = normalized.split('?')[0]?.split('#')[0] || '';
  if (!normalized) {
    return '';
  }

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized;
}

export function parseGuestAccessPaths(value?: string | null) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => normalizeGuestAccessPath(item))
        .filter(Boolean)
    )
  );
}

export function matchesGuestAccessPath(
  pathname: string,
  protectedPaths: string[]
) {
  const normalizedPath = normalizeGuestAccessPath(pathname);
  if (!normalizedPath) {
    return false;
  }

  return protectedPaths.some((item) => {
    if (item.endsWith('/*')) {
      const basePath = normalizeGuestAccessPath(item.slice(0, -2));
      return (
        !!basePath &&
        (normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`))
      );
    }

    return normalizedPath === item;
  });
}
