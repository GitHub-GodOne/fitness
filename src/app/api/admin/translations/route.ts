import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import {
  deleteI18nMessageOverride,
  saveI18nMessageOverride,
} from '@/shared/models/i18n-message';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

function revalidateTranslationPaths(locale: string) {
  const localeRoot = locale === 'en' ? '/' : `/${locale}`;
  revalidatePath(localeRoot, 'layout');
  revalidatePath(`/admin/translations`, 'page');
  revalidatePath(`/${locale}/admin/translations`, 'page');
}

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
    const key = String(body.key || '').trim();
    const value = String(body.value ?? '');

    if (!locale || !namespace || !key) {
      return respErr('locale, namespace and key are required', 400);
    }

    const result = await saveI18nMessageOverride({
      locale,
      namespace,
      key,
      value,
      updatedBy: user.id,
    });
    revalidateTranslationPaths(locale);

    return respData(result);
  } catch (error: any) {
    console.error('[Admin Translations] Save override failed:', error);
    return respErr(error.message || 'failed to save translation override', 500);
  }
}

export async function DELETE(req: NextRequest) {
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
    const key = String(body.key || '').trim();

    if (!locale || !namespace || !key) {
      return respErr('locale, namespace and key are required', 400);
    }

    const result = await deleteI18nMessageOverride({
      locale,
      namespace,
      key,
    });
    revalidateTranslationPaths(locale);

    return respData(result || { success: true });
  } catch (error: any) {
    console.error('[Admin Translations] Delete override failed:', error);
    return respErr(error.message || 'failed to delete translation override', 500);
  }
}
