import path from "path";

import { PERMISSIONS } from "@/core/rbac";
import { respData, respErr } from "@/shared/lib/resp";
import { getUserInfo } from "@/shared/models/user";
import { hasPermission } from "@/shared/services/rbac";
import { getStorageService } from "@/shared/services/storage";
import { MediaAssetType } from "@/shared/models/media-asset";

const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/mpeg": "mpeg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/ogg": "ogg",
    "audio/aac": "aac",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
  };

  return map[mimeType] || "";
};

function getMediaType(fileType: string) {
  if (fileType.startsWith("image/")) {
    return MediaAssetType.IMAGE;
  }

  if (fileType.startsWith("video/")) {
    return MediaAssetType.VIDEO;
  }

  if (fileType.startsWith("audio/")) {
    return MediaAssetType.AUDIO;
  }

  return null;
}

function normalizePath(value: string) {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
}

type PresignFileInput = {
  name?: string;
  size?: number;
  type?: string;
};

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr("no auth, please sign in", 401);
    }

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) {
      return respErr("no permission", 403);
    }

    const body = await req.json();
    const files = Array.isArray(body.files)
      ? (body.files as PresignFileInput[])
      : [];
    const customPath = normalizePath(String(body.path || ""));

    if (files.length === 0) {
      return respErr("No files provided", 400);
    }

    const storageService = await getStorageService();
    const providerName = storageService.getProviderNames()[0];

    if (!providerName) {
      return respErr("No storage provider configured", 500);
    }

    const instructions = [];

    for (const file of files) {
      const fileName = String(file.name || "").trim();
      const fileType = String(file.type || "").trim();
      if (!fileName) {
        return respErr("file name is required", 400);
      }

      const mediaType = getMediaType(fileType);
      if (!mediaType) {
        return respErr(`Unsupported file type: ${fileType || fileName}`, 400);
      }

      const ext =
        extFromMime(fileType) ||
        path.extname(fileName).replace(".", "") ||
        "bin";
      const safeBaseName =
        path
          .basename(fileName, path.extname(fileName))
          .replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
      const key = `${customPath ? `${customPath}/` : ""}${safeBaseName}.${ext}`;

      const signedUpload = await storageService.createSignedUploadWithProvider(
        {
          key,
          contentType: fileType || "application/octet-stream",
          disposition: "inline",
        },
        providerName,
      );

      if (!signedUpload.success || !signedUpload.url) {
        return respErr(
          signedUpload.error ||
            "Storage provider does not support direct uploads",
          501,
        );
      }

      instructions.push({
        provider: signedUpload.provider,
        method: signedUpload.method || "PUT",
        uploadUrl: signedUpload.url,
        headers: signedUpload.headers || {},
        key,
        name: fileName,
        size: Number(file.size || 0),
        contentType: fileType || "application/octet-stream",
        mediaType,
        publicUrl: signedUpload.publicUrl,
      });
    }

    return respData({
      items: instructions,
      count: instructions.length,
    });
  } catch (e: any) {
    console.error("[Admin Media Assets Presign] Failed:", e);
    return respErr(e.message || "failed to prepare upload", 500);
  }
}
