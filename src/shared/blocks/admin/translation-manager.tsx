'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Loader2, RotateCcw, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

import {
  buildMessageObject,
  flattenMessageLeaves,
} from '@/shared/lib/i18n-messages';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

type TranslationRow = {
  key: string;
  defaultValue: string;
  overrideValue?: string;
};

export function TranslationManager({
  adminLocale,
  targetLocale,
  namespacePath,
  namespaceRoot,
  availableLocales,
  availablePaths,
  initialRows,
}: {
  adminLocale: string;
  targetLocale: string;
  namespacePath: string;
  namespaceRoot: string;
  availableLocales: string[];
  availablePaths: string[];
  initialRows: TranslationRow[];
}) {
  const t = useTranslations('admin.translations.manager');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [resettingKey, setResettingKey] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialRows.map((row) => [row.key, row.overrideValue ?? row.defaultValue])
    )
  );
  const [overrides, setOverrides] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(initialRows.map((row) => [row.key, row.overrideValue]))
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return initialRows;
    }

    return initialRows.filter((row) => {
      const currentOverride = overrides[row.key] ?? '';
      return (
        row.key.toLowerCase().includes(query) ||
        row.defaultValue.toLowerCase().includes(query) ||
        currentOverride.toLowerCase().includes(query)
      );
    });
  }, [initialRows, overrides, search]);

  const fileInputId = 'translation-json-import';

  function downloadObject(filename: string, data: Record<string, any>) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 200);
  }

  function handleExportMerged() {
    const payload = buildMessageObject(
      initialRows.map((row) => ({
        key: row.key,
        value: drafts[row.key] ?? overrides[row.key] ?? row.defaultValue,
      }))
    );
    downloadObject(`${targetLocale}-${namespacePath.replace(/\//g, '_')}.json`, payload);
  }

  function handleExportOverrides() {
    const payload = buildMessageObject(
      initialRows
        .filter((row) => overrides[row.key] !== undefined)
        .map((row) => ({
          key: row.key,
          value: overrides[row.key] as string,
        }))
    );
    downloadObject(
      `${targetLocale}-${namespacePath.replace(/\//g, '_')}.overrides.json`,
      payload
    );
  }

  async function handleImportFile(file: File | null) {
    if (!file) {
      return;
    }

    try {
      setImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const entries = flattenMessageLeaves(parsed);

      if (entries.length === 0) {
        throw new Error(t('messages.importEmpty'));
      }

      const response = await fetch('/api/admin/translations/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locale: targetLocale,
          namespace: namespaceRoot,
          mode: importMode,
          entries,
        }),
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || t('messages.importFailed'));
      }

      const importedValueMap = new Map(entries.map((entry) => [entry.key, entry.value]));

      if (importMode === 'replace') {
        setOverrides(
          Object.fromEntries(entries.map((entry) => [entry.key, entry.value]))
        );
        setDrafts(
          Object.fromEntries(
            initialRows.map((row) => [
              row.key,
              importedValueMap.get(row.key) ?? row.defaultValue,
            ])
          )
        );
      } else {
        setOverrides((current) => ({
          ...current,
          ...Object.fromEntries(entries.map((entry) => [entry.key, entry.value])),
        }));
        setDrafts((current) => ({
          ...current,
          ...Object.fromEntries(entries.map((entry) => [entry.key, entry.value])),
        }));
      }

      toast.success(
        t('messages.imported', {
          count: payload.data?.count ?? entries.length,
        })
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || t('messages.importFailed'));
    } finally {
      setImporting(false);
      const input = document.getElementById(fileInputId) as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
    }
  }

  function updateQuery(next: { locale?: string; path?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('targetLocale', next.locale ?? targetLocale);
    params.set('path', next.path ?? namespacePath);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  async function saveRow(row: TranslationRow) {
    try {
      setSavingKey(row.key);
      const value = drafts[row.key] ?? row.defaultValue;
      const response = await fetch('/api/admin/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locale: targetLocale,
          namespace: namespaceRoot,
          key: row.key,
          value,
        }),
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || t('messages.saveFailed'));
      }

      setOverrides((current) => ({
        ...current,
        [row.key]: value,
      }));
      toast.success(t('messages.saved'));
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || t('messages.saveFailed'));
    } finally {
      setSavingKey(null);
    }
  }

  async function resetRow(row: TranslationRow) {
    try {
      setResettingKey(row.key);
      const response = await fetch('/api/admin/translations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locale: targetLocale,
          namespace: namespaceRoot,
          key: row.key,
        }),
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || t('messages.resetFailed'));
      }

      setOverrides((current) => ({
        ...current,
        [row.key]: undefined,
      }));
      setDrafts((current) => ({
        ...current,
        [row.key]: row.defaultValue,
      }));
      toast.success(t('messages.reset'));
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || t('messages.resetFailed'));
    } finally {
      setResettingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-6">
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(280px,420px)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label>{t('filters.locale')}</Label>
            <Select
              value={targetLocale}
              onValueChange={(value) => updateQuery({ locale: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLocales.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {locale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('filters.namespace')}</Label>
            <Select
              value={namespacePath}
              onValueChange={(value) => updateQuery({ path: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePaths.map((path) => (
                  <SelectItem key={path} value={path}>
                    {path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('filters.search')}</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('filters.searchPlaceholder')}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-muted/20 p-4">
          <div className="text-sm font-medium">{t('summary.title')}</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('summary.description')}
          </p>
          <div className="mt-3 text-xs text-muted-foreground">
            {adminLocale !== targetLocale
              ? `${adminLocale} UI / ${targetLocale} content`
              : targetLocale}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label>{t('filters.importMode')}</Label>
              <Select
                value={importMode}
                onValueChange={(value: 'merge' | 'replace') => setImportMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">{t('filters.importModes.merge')}</SelectItem>
                  <SelectItem value="replace">{t('filters.importModes.replace')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground xl:pb-2">
              {importMode === 'replace'
                ? t('summary.replaceDescription')
                : t('summary.mergeDescription')}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={handleExportMerged}>
              <Download className="size-4" />
              {t('actions.exportCurrent')}
            </Button>
            <Button type="button" variant="outline" onClick={handleExportOverrides}>
              <Download className="size-4" />
              {t('actions.exportOverrides')}
            </Button>
            <input
              id={fileInputId}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => handleImportFile(event.target.files?.[0] || null)}
            />
            <Button
              type="button"
              onClick={() =>
                (document.getElementById(fileInputId) as HTMLInputElement | null)?.click()
              }
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {t('actions.importJson')}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {initialRows.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
            {t('messages.noRows')}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
            {t('messages.noSearchResults')}
          </div>
        ) : (
          filteredRows.map((row) => {
            const overrideValue = overrides[row.key];
            const isOverridden = overrideValue !== undefined;
            const isSaving = savingKey === row.key;
            const isResetting = resettingKey === row.key;

            return (
              <article key={row.key} className="rounded-3xl border bg-card p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('columns.key')}
                    </div>
                    <h2 className="break-all text-base font-semibold">{row.key}</h2>
                    <span className="inline-flex rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {isOverridden ? t('badges.overridden') : t('badges.default')}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resetRow(row)}
                      disabled={!isOverridden || isSaving || isResetting}
                    >
                      {isResetting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4" />
                      )}
                      {isResetting ? t('actions.resetting') : t('actions.reset')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => saveRow(row)}
                      disabled={isSaving || isResetting}
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      {isSaving ? t('actions.saving') : t('actions.save')}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{t('columns.defaultValue')}</div>
                    <Textarea
                      readOnly
                      value={row.defaultValue}
                      className="min-h-[140px] resize-y bg-muted/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">{t('columns.overrideValue')}</div>
                    <Textarea
                      value={drafts[row.key] ?? row.defaultValue}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.key]: event.target.value,
                        }))
                      }
                      className="min-h-[140px] resize-y"
                    />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {isPending ? (
        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          {t('messages.loading')}
        </div>
      ) : null}
    </div>
  );
}
