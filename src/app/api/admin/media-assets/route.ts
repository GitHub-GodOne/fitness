import { NextRequest } from 'next/server';

import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getMediaAssets, getMediaAssetsCount, MediaAssetType } from '@/shared/models/media-asset';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

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
    const mediaType = searchParams.get('mediaType') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const normalizedType =
      mediaType === MediaAssetType.IMAGE ||
      mediaType === MediaAssetType.VIDEO ||
      mediaType === MediaAssetType.AUDIO
        ? mediaType
        : undefined;

    const [items, total] = await Promise.all([
      getMediaAssets({
        mediaType: normalizedType,
        page,
        limit,
      }),
      getMediaAssetsCount({
        mediaType: normalizedType,
      }),
    ]);

    return respData({
      items,
      total,
      page,
      limit,
    });
  } catch (e: any) {
    console.error('[Admin Media Assets] Failed:', e);
    return respErr(e.message || 'failed to get media assets', 500);
  }
}
