import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { addMediaAsset, MediaAssetType } from '@/shared/models/media-asset';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getStorageService } from '@/shared/services/storage';
import { getUuid } from '@/shared/lib/hash';
import { replaceR2Url } from '@/shared/lib/url';

type CompleteUploadItem = {
  provider?: string;
  key?: string;
  name?: string;
  size?: number;
  contentType?: string;
  mediaType?: string;
  publicUrl?: string;
};

function isSupportedMediaType(value: string): value is MediaAssetType {
  return (
    value === MediaAssetType.IMAGE ||
    value === MediaAssetType.VIDEO ||
    value === MediaAssetType.AUDIO
  );
}

export async function POST(req: Request) {
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
    const items = Array.isArray(body.items) ? (body.items as CompleteUploadItem[]) : [];

    if (items.length === 0) {
      return respErr('No uploaded items provided', 400);
    }

    const storageService = await getStorageService();
    const saved = [];

    for (const item of items) {
      const provider = String(item.provider || '').trim();
      const key = String(item.key || '').trim();
      const name = String(item.name || '').trim();
      const contentType = String(item.contentType || 'application/octet-stream').trim();
      const mediaType = String(item.mediaType || '').trim();
      const publicUrl = String(item.publicUrl || '').trim();

      if (!provider || !key || !name || !mediaType || !publicUrl) {
        return respErr('uploaded item is missing required fields', 400);
      }

      if (!isSupportedMediaType(mediaType)) {
        return respErr(`Unsupported media type: ${mediaType}`, 400);
      }

      const exists = await storageService.existsWithProvider({ key }, provider);
      if (!exists) {
        return respErr(`Uploaded object not found for key: ${key}`, 400);
      }

      const asset = await addMediaAsset({
        id: getUuid(),
        userId: user.id,
        provider,
        mediaType,
        name,
        key,
        url: replaceR2Url(publicUrl),
        contentType,
        size: Number(item.size || 0),
      });

      saved.push(asset);
    }

    return respData({
      items: saved,
      count: saved.length,
    });
  } catch (e: any) {
    console.error('[Admin Media Assets Complete] Failed:', e);
    return respErr(e.message || 'failed to finalize upload', 500);
  }
}
