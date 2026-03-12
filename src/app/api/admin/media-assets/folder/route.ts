import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import { getStorageService } from '@/shared/services/storage';

function normalizeSegment(value: string) {
  return value
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
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
    const prefix = normalizeSegment(String(body.prefix || ''));
    const name = normalizeSegment(String(body.name || ''));

    if (!name) {
      return respErr('folder name is required', 400);
    }

    if (name.includes('/')) {
      return respErr('folder name cannot contain slash', 400);
    }

    const storageService = await getStorageService();
    const folderPrefix = prefix ? `${prefix}/${name}` : name;
    const key = `${folderPrefix}/.keep`;

    const uploadResult = await storageService.uploadFile({
      body: Buffer.from(''),
      key,
      contentType: 'text/plain',
      disposition: 'inline',
    });

    if (!uploadResult.success) {
      return respErr(uploadResult.error || 'failed to create folder', 500);
    }

    return respData({
      prefix: folderPrefix,
      key,
    });
  } catch (e: any) {
    console.error('[Admin Media Assets Folder] Failed:', e);
    return respErr(e.message || 'failed to create folder', 500);
  }
}
