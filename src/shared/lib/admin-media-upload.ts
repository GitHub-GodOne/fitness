type UploadInstruction = {
  provider: string;
  method: 'PUT';
  uploadUrl: string;
  headers: Record<string, string>;
  key: string;
  name: string;
  size: number;
  contentType: string;
  mediaType: 'image' | 'video' | 'audio';
  publicUrl?: string;
};

type UploadCompleteItem = {
  provider: string;
  key: string;
  name: string;
  size: number;
  contentType: string;
  mediaType: 'image' | 'video' | 'audio';
  publicUrl?: string;
};

type UploadedAsset = {
  id: string;
  userId: string;
  provider: string;
  mediaType: string;
  name: string;
  key: string;
  url: string;
  contentType: string;
  size: number;
};

function filterUploadHeaders(headers: Record<string, string>) {
  const blocked = new Set(['host', 'content-length']);

  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => !blocked.has(key.toLowerCase()))
  );
}

async function legacyUpload(files: File[], uploadPath: string): Promise<UploadedAsset[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  formData.append('path', uploadPath);

  const response = await fetch('/api/admin/media-assets/upload', {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json();

  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.message || 'Upload failed');
  }

  return payload.data?.items || [];
}

export async function uploadAdminMediaFilesDirect({
  files,
  path,
}: {
  files: File[];
  path: string;
}): Promise<UploadedAsset[]> {
  if (files.length === 0) {
    return [];
  }

  const response = await fetch('/api/admin/media-assets/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      files: files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    }),
  });

  const payload = await response.json().catch(() => null);

  if (
    response.status === 501 ||
    payload?.message?.includes('does not support direct uploads')
  ) {
    return legacyUpload(files, path);
  }

  if (!response.ok || payload?.code !== 0) {
    throw new Error(payload?.message || 'Failed to prepare upload');
  }

  const instructions = (payload.data?.items || []) as UploadInstruction[];
  if (instructions.length !== files.length) {
    throw new Error('Upload preparation returned an unexpected number of files');
  }

  const completedItems: UploadCompleteItem[] = [];

  for (const [index, instruction] of instructions.entries()) {
    const file = files[index];
    const uploadResponse = await fetch(instruction.uploadUrl, {
      method: instruction.method,
      headers: filterUploadHeaders(instruction.headers || {}),
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => '');
      throw new Error(
        errorText || `Direct upload failed with status ${uploadResponse.status}`
      );
    }

    completedItems.push({
      provider: instruction.provider,
      key: instruction.key,
      name: instruction.name,
      size: instruction.size,
      contentType: instruction.contentType,
      mediaType: instruction.mediaType,
      publicUrl: instruction.publicUrl,
    });
  }

  const completeResponse = await fetch('/api/admin/media-assets/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: completedItems,
    }),
  });
  const completePayload = await completeResponse.json();

  if (!completeResponse.ok || completePayload.code !== 0) {
    throw new Error(completePayload.message || 'Failed to finalize upload');
  }

  return completePayload.data?.items || [];
}
