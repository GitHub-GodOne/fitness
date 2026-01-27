import { md5 } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { replaceR2Url } from '@/shared/lib/url';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

const extFromMime = (mimeType: string) => {
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
  };
  return map[mimeType] || '';
};

export async function POST(req: Request) {
  try {
    // Check user authentication first
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    console.log('[API] Received files:', files.length);
    files.forEach((file, i) => {
      console.log(`[API] File ${i}:`, {
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
      console.log('[API] Created pic directory:', picDir);
    } catch (err) {
      console.error('[API] Failed to create pic directory:', err);
    }

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return respErr(`File ${file.name} is not an image`);
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
        console.log('[API] File already exists, reusing:', filename);
      } catch {
        // File doesn't exist, will upload
      }

      if (!exists) {
        // Save file to disk
        await fs.writeFile(filePath, body);
        console.log('[API] File saved:', filePath);
      }

      const publicUrl = `/pic/${dateFolder}/${filename}`;
      uploadResults.push({
        url: publicUrl,
        key: filename,
        filename: file.name,
        deduped: exists,
      });
    }

    console.log(
      '[API] All uploads complete. Returning URLs:',
      uploadResults.map((r) => r.url)
    );

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e) {
    console.error('upload image failed:', e);
    return respErr('upload image failed');
  }
}
