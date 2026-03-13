import { NextRequest } from 'next/server';

import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import {
  deleteI18nMessageOverridesByNamespace,
  saveI18nMessageOverridesBatch,
} from '@/shared/models/i18n-message';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in', 401);
    }

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) {
      return respErr('no permission', 403);
    }

    const body = await req.json();
    const locale = String(body.locale || '').trim();
    const namespace = String(body.namespace || '').trim();
    const mode = body.mode === 'replace' ? 'replace' : 'merge';
    const rawEntries: Array<{ key?: unknown; value?: unknown }> = Array.isArray(
      body.entries
    )
      ? body.entries
      : [];

    if (!locale || !namespace) {
      return respErr('locale and namespace are required', 400);
    }

    const entries = rawEntries
      .map((entry: { key?: unknown; value?: unknown }) => ({
        key: String(entry?.key || '').trim(),
        value: String(entry?.value ?? ''),
      }))
      .filter((entry: { key: string; value: string }) => entry.key);

    if (entries.length === 0) {
      return respErr('entries are required', 400);
    }

    if (mode === 'replace') {
      await deleteI18nMessageOverridesByNamespace({ locale, namespace });
    }

    const result = await saveI18nMessageOverridesBatch({
      locale,
      namespace,
      entries,
      updatedBy: user.id,
    });

    return respData({
      count: result.length,
      mode,
    });
  } catch (error: any) {
    console.error('[Admin Translations Batch] Import failed:', error);
    return respErr(error.message || 'failed to import translation overrides', 500);
  }
}
