import { NextRequest } from 'next/server';

import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import {
  deleteMediaAssetById,
  getMediaAssetById,
} from '@/shared/models/media-asset';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getStorageService } from '@/shared/services/storage';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in', 401);
    }

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) {
      return respErr('no permission', 403);
    }

    const { id } = await params;
    if (!id) {
      return respErr('invalid asset id', 400);
    }

    const asset = await getMediaAssetById(id);
    if (!asset) {
      return respErr('asset not found', 404);
    }

    const storageService = await getStorageService();
    const deleteResult = await storageService.deleteFileWithProvider(
      {
        key: asset.key,
        url: asset.url,
      },
      asset.provider
    );

    if (!deleteResult.success) {
      return respErr(deleteResult.error || 'failed to delete asset file', 500);
    }

    const deletedAsset = await deleteMediaAssetById(id);
    if (!deletedAsset) {
      return respErr('failed to delete asset record', 500);
    }

    return respData({
      item: deletedAsset,
    });
  } catch (e: any) {
    console.error('[Admin Media Asset Delete] Failed:', e);
    return respErr(e.message || 'failed to delete media asset', 500);
  }
}
