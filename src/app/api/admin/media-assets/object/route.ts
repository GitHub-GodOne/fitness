import { NextRequest } from 'next/server';

import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { deleteMediaAssetByKey } from '@/shared/models/media-asset';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getStorageService } from '@/shared/services/storage';

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
    const key = String(body.key || '').trim();
    const url = String(body.url || '').trim();

    if (!key) {
      return respErr('invalid object key', 400);
    }

    const storageService = await getStorageService();
    const deleteResult = await storageService.deleteFile({
      key,
      url: url || undefined,
    });

    if (!deleteResult.success) {
      return respErr(deleteResult.error || 'failed to delete object', 500);
    }

    await deleteMediaAssetByKey(key);

    return respData({
      key,
    });
  } catch (e: any) {
    console.error('[Admin Media Assets Object Delete] Failed:', e);
    return respErr(e.message || 'failed to delete object', 500);
  }
}
