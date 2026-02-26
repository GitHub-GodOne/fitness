import { md5 } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    // Images
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    // Videos
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'video/mov': 'mov',
    'video/quicktime': 'mov',
    'video/avi': 'avi',
    'video/flv': 'flv',
    'video/mkv': 'mkv',
  };
  return map[mimeType] || '';
};

const isImage = (mimeType: string) => mimeType.startsWith('image/');
const isVideo = (mimeType: string) => mimeType.startsWith('video/');

export async function POST(req: Request) {
  try {
    // Check admin permission first
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const canUpload = await hasPermission(user.id, 'admin.video-library.write');
    if (!canUpload) {
      return respErr('no permission', 403);
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    console.log('[Admin Upload] Received files:', files.length);
    files.forEach((file, i) => {
      console.log(`[Admin Upload] File ${i}:`, {
        name: file.name,
        type: file.type,
        size: file.size,
      });
    });

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    // Save to local public/pic/{date} folder
    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadResults = [];

    // Get current date in YYYYMMDD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateFolder = `${year}${month}${day}`;

    // Ensure public/pic/{date} directory exists
    const picDir = path.join(process.cwd(), 'public', 'pic', dateFolder);
    try {
      await fs.mkdir(picDir, { recursive: true });
      console.log('[Admin Upload] Created pic directory:', picDir);
    } catch (err) {
      console.error('[Admin Upload] Failed to create pic directory:', err);
    }

    for (const file of files) {
      // Validate file type (image or video)
      if (!isImage(file.type) && !isVideo(file.type)) {
        return respErr(`File ${file.name} is not a valid image or video`);
      }

      // File size limits
      if (isImage(file.type) && file.size > 10 * 1024 * 1024) {
        return respErr(`Image ${file.name} exceeds 10MB limit`);
      }
      if (isVideo(file.type) && file.size > 100 * 1024 * 1024) {
        return respErr(`Video ${file.name} exceeds 100MB limit`);
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const body = Buffer.from(arrayBuffer);

      const digest = md5(body);
      const ext = extFromMime(file.type) || file.name.split('.').pop() || 'bin';
      const filename = `${digest}.${ext}`;
      const filePath = path.join(picDir, filename);

      // Check if file already exists (deduplication)
      let exists = false;
      try {
        await fs.access(filePath);
        exists = true;
        console.log('[Admin Upload] File already exists, reusing:', filename);
      } catch {
        // File doesn't exist, will upload
      }

      if (!exists) {
        // Save file to disk
        await fs.writeFile(filePath, body);
        console.log('[Admin Upload] File saved:', filePath);
      }

      const publicUrl = `/pic/${dateFolder}/${filename}`;
      uploadResults.push({
        url: publicUrl,
        key: filename,
        filename: file.name,
        type: isVideo(file.type) ? 'video' : 'image',
        deduped: exists,
      });
    }

    console.log(
      '[Admin Upload] All uploads complete. Returning URLs:',
      uploadResults.map((r) => r.url)
    );

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e) {
    console.error('[Admin Upload] Upload failed:', e);
    return respErr('Upload failed');
  }
}
