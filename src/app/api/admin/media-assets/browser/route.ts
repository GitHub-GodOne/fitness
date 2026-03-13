import { NextRequest } from 'next/server';

import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { replaceR2Url } from '@/shared/lib/url';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getStorageService } from '@/shared/services/storage';

function normalizePrefix(prefix: string) {
  return prefix.trim().replace(/^\/+/, '').replace(/\/+/g, '/').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in', 401);
    }

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) {
      return respErr('no permission', 403);
    }

    const { searchParams } = new URL(req.url);
    const prefix = normalizePrefix(searchParams.get('prefix') || '');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const storageService = await getStorageService();
    const result = await storageService.listFiles({
      prefix,
      limit,
    });

    if (!result.success) {
      return respErr(result.error || 'failed to list files', 500);
    }

    const breadcrumbs = result.prefix
      ? result.prefix.split('/').filter(Boolean).map((segment, index, parts) => ({
          name: segment,
          prefix: parts.slice(0, index + 1).join('/'),
        }))
      : [];

    return respData({
      provider: result.provider,
      prefix: result.prefix,
      breadcrumbs,
      directories: result.directories,
      files: result.files.map((file) => ({
        ...file,
        url: replaceR2Url(file.url),
      })),
    });
  } catch (e: any) {
    console.error('[Admin Media Assets Browser] Failed:', e);
    return respErr(e.message || 'failed to browse media assets', 500);
  }
}
