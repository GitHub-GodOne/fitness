import { getTranslations, setRequestLocale } from 'next-intl/server';

import { localeMessagesPaths, locales } from '@/config/locale';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { loadMessages } from '@/core/i18n/request';
import { TranslationManager } from '@/shared/blocks/admin/translation-manager';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { flattenMessageLeaves } from '@/shared/lib/i18n-messages';
import { getI18nMessageOverridesByNamespace } from '@/shared/models/i18n-message';
import type { Crumb } from '@/shared/types/blocks/common';

function toNamespaceRoot(path: string) {
  return path.split('/').join('.');
}

export default async function TranslationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ targetLocale?: string; path?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.translations.page');
  const { targetLocale, path } = await searchParams;

  const activeTargetLocale = locales.includes(targetLocale || '')
    ? (targetLocale as string)
    : locale;
  const activePath = localeMessagesPaths.includes(path || '')
    ? (path as string)
    : 'pages/showcases';
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
          adminLocale={locale}
          targetLocale={activeTargetLocale}
          namespacePath={activePath}
          namespaceRoot={namespaceRoot}
          availableLocales={locales}
          availablePaths={localeMessagesPaths}
          initialRows={rows}
        />
      </Main>
    </>
  );
}
