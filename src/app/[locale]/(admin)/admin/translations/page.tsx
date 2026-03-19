import { getTranslations, setRequestLocale } from 'next-intl/server';

import { localeMessagesPaths, locales } from '@/config/locale';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { loadMessages } from '@/core/i18n/request';
import { TranslationManager } from '@/shared/blocks/admin/translation-manager';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { flattenMessageLeaves } from '@/shared/lib/i18n-messages';
import {
  getI18nMessageOverrides,
  getI18nMessageOverridesByNamespace,
} from '@/shared/models/i18n-message';
import type { Crumb } from '@/shared/types/blocks/common';

function toNamespaceRoot(path: string) {
  return path.split('/').join('.');
}

type TranslationSearchMatch = {
  locale: string;
  path: string;
  namespace: string;
  key: string;
  defaultValue: string;
  overrideValue?: string;
  effectiveValue: string;
};

async function searchTranslationMatches({
  localesToSearch,
  query,
}: {
  localesToSearch: string[];
  query: string;
}): Promise<TranslationSearchMatch[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const matches: TranslationSearchMatch[] = [];

  for (const locale of localesToSearch) {
    const overrides = await getI18nMessageOverrides(locale);
    const overridesByNamespace = new Map<string, Map<string, string>>();

    overrides.forEach((item) => {
      const namespaceOverrides =
        overridesByNamespace.get(item.namespace) ?? new Map<string, string>();
      namespaceOverrides.set(item.key, item.value);
      overridesByNamespace.set(item.namespace, namespaceOverrides);
    });

    const defaultMessagesByPath = await Promise.all(
      localeMessagesPaths.map(async (path) => ({
        path,
        namespace: toNamespaceRoot(path),
        messages: await loadMessages(path, locale),
      }))
    );

    for (const item of defaultMessagesByPath) {
      const flattenedDefaults = flattenMessageLeaves(item.messages);
      const namespaceOverrides =
        overridesByNamespace.get(item.namespace) ?? new Map<string, string>();
      const defaultKeys = new Set(flattenedDefaults.map((row) => row.key));

      const rows = [
        ...flattenedDefaults.map((row) => ({
          key: row.key,
          defaultValue: row.value,
          overrideValue: namespaceOverrides.get(row.key),
        })),
        ...Array.from(namespaceOverrides.entries())
          .filter(([key]) => !defaultKeys.has(key))
          .map(([key, value]) => ({
            key,
            defaultValue: '',
            overrideValue: value,
          })),
      ];

      for (const row of rows) {
        const effectiveValue = row.overrideValue ?? row.defaultValue;
        const haystacks = [
          locale,
          item.path,
          row.key,
          row.defaultValue,
          row.overrideValue ?? '',
          effectiveValue,
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase());

        if (!haystacks.some((value) => value.includes(normalizedQuery))) {
          continue;
        }

        matches.push({
          locale,
          path: item.path,
          namespace: item.namespace,
          key: row.key,
          defaultValue: row.defaultValue,
          overrideValue: row.overrideValue,
          effectiveValue,
        });

        if (matches.length >= 100) {
          return matches;
        }
      }
    }
  }

  return matches;
}

export default async function TranslationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    targetLocale?: string;
    path?: string;
    search?: string;
    globalSearch?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.translations.page');
  const { targetLocale, path, search, globalSearch } = await searchParams;

  const activeTargetLocale = locales.includes(targetLocale || '')
    ? (targetLocale as string)
    : locale;
  const activePath = localeMessagesPaths.includes(path || '')
    ? (path as string)
    : 'pages/showcases';
  const activeSearch = typeof search === 'string' ? search : '';
  const activeGlobalSearch =
    typeof globalSearch === 'string' ? globalSearch.trim() : '';
  const namespaceRoot = toNamespaceRoot(activePath);

  const defaultMessages = await loadMessages(activePath, activeTargetLocale);
  const flattenedDefaults = flattenMessageLeaves(defaultMessages).sort((a, b) =>
    a.key.localeCompare(b.key)
  );
  const overrides = await getI18nMessageOverridesByNamespace({
    locale: activeTargetLocale,
    namespace: namespaceRoot,
  });
  const overridesMap = new Map(overrides.map((item) => [item.key, item.value]));

  const mergedRows = flattenedDefaults.map((row) => ({
    key: row.key,
    defaultValue: row.value,
    overrideValue: overridesMap.get(row.key),
  }));

  const staleOverrideRows = overrides
    .filter((item) => !flattenedDefaults.some((row) => row.key === item.key))
    .map((item) => ({
      key: item.key,
      defaultValue: '',
      overrideValue: item.value,
    }));

  const rows = [...mergedRows, ...staleOverrideRows];
  const globalSearchMatches = activeGlobalSearch
    ? await searchTranslationMatches({
        localesToSearch: locales,
        query: activeGlobalSearch,
      })
    : [];

  const crumbs: Crumb[] = [
    { title: t('crumbs.admin'), url: '/admin' },
    { title: t('crumbs.translations'), is_active: true },
  ];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('title')} description={t('description')} />
        <TranslationManager
          key={`${activeTargetLocale}:${activePath}:${activeSearch}:${activeGlobalSearch}`}
          adminLocale={locale}
          targetLocale={activeTargetLocale}
          namespacePath={activePath}
          namespaceRoot={namespaceRoot}
          availableLocales={locales}
          availablePaths={localeMessagesPaths}
          initialSearch={activeSearch}
          initialGlobalSearch={activeGlobalSearch}
          globalSearchMatches={globalSearchMatches}
          initialRows={rows}
        />
      </Main>
    </>
  );
}
