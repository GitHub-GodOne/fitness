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

const isFileLike = (
  value: FormDataEntryValue | null | undefined
): value is File => {
  if (!value || typeof value === 'string') {
    return false;
  }

  return (
    typeof value === 'object' &&
    typeof value.arrayBuffer === 'function' &&
    typeof value.type === 'string' &&
    typeof value.name === 'string'
  );
};

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in', 401);
    }

    const formData = await req.formData();
    const rawFiles = formData.getAll('files');
    const files = rawFiles.filter(isFileLike);

    if (files.length === 0) {
      return respErr('No files provided', 400);
    }

    const storageService = await getStorageService();
    const hasStorageProvider = storageService.getProviderNames().length > 0;

    const fs = await import('fs/promises');
    const uploadResults = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateFolder = `${year}${month}${day}`;

    const picDir = path.join(process.cwd(), 'public', 'pic', dateFolder);

    if (!hasStorageProvider) {
      await fs.mkdir(picDir, { recursive: true });
    }

    for (const file of files) {
      if (!file.type || !file.type.startsWith('image/')) {
        return respErr(`File ${file.name} is not an image`, 400);
      }

      const arrayBuffer = await file.arrayBuffer();
      const body = Buffer.from(arrayBuffer);
      const digest = md5(body);
      const ext = extFromMime(file.type) || file.name.split('.').pop() || 'bin';

      if (hasStorageProvider) {
        const key = `images/${dateFolder}/${getUuid()}-${digest}.${ext}`;
        const uploadResult = await storageService.uploadFile({
          body,
          key,
          contentType: file.type || 'application/octet-stream',
          disposition: 'inline',
        });

        if (!uploadResult.success || !uploadResult.url) {
          return respErr(uploadResult.error || 'upload image failed', 500);
        }

        uploadResults.push({
          url: replaceR2Url(uploadResult.url),
          key,
          filename: file.name,
          deduped: false,
          provider: uploadResult.provider,
        });
        continue;
      }

      const filename = `${digest}.${ext}`;
      const filePath = path.join(picDir, filename);
      let exists = false;

      try {
        await fs.access(filePath);
        exists = true;
      } catch {
        exists = false;
      }

      if (!exists) {
        await fs.writeFile(filePath, body);
      }

      const publicUrl = `/pic/${dateFolder}/${filename}`;
      uploadResults.push({
        url: publicUrl,
        key: filename,
        filename: file.name,
        deduped: exists,
        provider: 'local',
      });
    }

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e: any) {
    console.error('upload image failed:', e);
    return respErr(e?.message || 'upload image failed', 500);
  }
}
