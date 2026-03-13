import path from 'path';

import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { addMediaAsset, MediaAssetType } from '@/shared/models/media-asset';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getStorageService } from '@/shared/services/storage';
import { getUuid } from '@/shared/lib/hash';
import { replaceR2Url } from '@/shared/lib/url';

const imageExtFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/mpeg': 'mpeg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
    'audio/ogg': 'ogg',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/flac': 'flac',
    'audio/x-flac': 'flac',
  };
  return map[mimeType] || '';
};

function getMediaTypeFromFile(file: File) {
  if (file.type.startsWith('image/')) {
    return MediaAssetType.IMAGE;
  }

  if (file.type.startsWith('video/')) {
    return MediaAssetType.VIDEO;
  }

  if (file.type.startsWith('audio/')) {
    return MediaAssetType.AUDIO;
  }

  return null;
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

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const customPath = String(formData.get('path') || '')
      .trim()
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '');

    if (!files || files.length === 0) {
      return respErr('No files provided', 400);
    }

    const storageService = await getStorageService();
    const uploaded = [];

    for (const file of files) {
      const mediaType = getMediaTypeFromFile(file);
      if (!mediaType) {
        return respErr(`Unsupported file type: ${file.type || file.name}`, 400);
      }

      const ext =
        imageExtFromMime(file.type) || path.extname(file.name).replace('.', '') || 'bin';
      const id = getUuid();
      const safeBaseName =
        path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9._-]/g, '_') ||
        id;
      const key = `${customPath ? `${customPath}/` : ''}${safeBaseName}.${ext}`;
      const body = Buffer.from(await file.arrayBuffer());

      const uploadResult = await storageService.uploadFile({
        body,
        key,
        contentType: file.type || 'application/octet-stream',
        disposition: 'inline',
      });

      if (!uploadResult.success || !uploadResult.url) {
        return respErr(uploadResult.error || 'upload failed', 500);
      }

      const asset = await addMediaAsset({
        id,
        userId: user.id,
        provider: uploadResult.provider,
        mediaType,
        name: file.name,
        key,
        url: replaceR2Url(uploadResult.url),
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });

      uploaded.push(asset);
    }

    return respData({
      items: uploaded,
      count: uploaded.length,
    });
  } catch (e: any) {
    console.error('[Admin Media Assets Upload] Failed:', e);
    return respErr(e.message || 'upload failed', 500);
  }
}
