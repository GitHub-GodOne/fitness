import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

import type { AITaskInfo } from "@/extensions/ai/types";
import { getUuid } from "@/shared/lib/hash";
import { replaceR2Url } from "@/shared/lib/url";
import { getAllConfigs } from "@/shared/models/config";
import { getStorageService } from "@/shared/services/storage";

function pickVideoUrl(taskInfo?: AITaskInfo | null, taskResult?: any) {
  const videoFromTaskInfo = Array.isArray(taskInfo?.videos)
    ? taskInfo?.videos.find((item) => item?.videoUrl)?.videoUrl
    : null;

  return (
    taskResult?.saved_video_url ||
    taskResult?.video_url ||
    taskResult?.original_video_url ||
    taskResult?.content?.video_url ||
    videoFromTaskInfo ||
    null
  );
}

function hasThumbnail(taskInfo?: AITaskInfo | null, taskResult?: any) {
  const taskInfoThumbnail = Array.isArray(taskInfo?.videos)
    ? taskInfo.videos.find(
        (item) => item?.thumbnailUrl || (item as any)?.thumbnail_url,
      )?.thumbnailUrl ||
      (taskInfo.videos.find((item) => item?.thumbnailUrl || (item as any)?.thumbnail_url) as any)
        ?.thumbnail_url
    : null;

  return Boolean(
    taskResult?.cover_url ||
      taskResult?.coverUrl ||
      taskResult?.saved_last_frame_image ||
      taskResult?.last_frame_image ||
      taskResult?.saved_last_frame_url ||
      taskResult?.last_frame_url ||
      taskResult?.poster ||
      taskInfoThumbnail,
  );
}

async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    const ffmpeg = await import("fluent-ffmpeg");
    return typeof ffmpeg.default === "function" || typeof ffmpeg === "function";
  } catch {
    return false;
  }
}

async function extractFrameFromVideoUrl({
  videoUrl,
  outputPath,
}: {
  videoUrl: string;
  outputPath: string;
}) {
  const ffmpegModule = await import("fluent-ffmpeg");
  const ffmpeg = (ffmpegModule as any).default || (ffmpegModule as any);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoUrl)
      .inputOptions(["-ss 00:00:00.200"])
      .outputOptions(["-frames:v 1"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (error: Error) => reject(error))
      .run();
  });
}

function deriveThumbnailKeyFromVideoUrl({
  videoUrl,
  uploadPath,
  fallbackTaskId,
}: {
  videoUrl: string;
  uploadPath?: string | null;
  fallbackTaskId: string;
}) {
  try {
    const parsed = new URL(videoUrl);
    const rawPath = parsed.pathname.replace(/^\/+/, "");
    const normalizedUploadPath = (uploadPath || "uploads").replace(
      /^\/+|\/+$/g,
      "",
    );

    let relativeKey = rawPath;

    const uploadPathPrefix = `${normalizedUploadPath}/`;
    const uploadPathIndex = rawPath.indexOf(uploadPathPrefix);
    if (uploadPathIndex !== -1) {
      relativeKey = rawPath.slice(uploadPathIndex + uploadPathPrefix.length);
    }

    const thumbnailKey = relativeKey.replace(
      /final_video\.[a-z0-9]+$/i,
      "final_video.png",
    );
    if (thumbnailKey !== relativeKey) {
      return thumbnailKey;
    }

    const genericKey = relativeKey.replace(/\.[a-z0-9]+$/i, ".png");
    if (genericKey !== relativeKey) {
      return genericKey;
    }
  } catch {
    // Ignore and use fallback below.
  }

  return `video-thumbnails/${fallbackTaskId}/${getUuid()}.png`;
}

export async function ensureUploadedVideoThumbnail(params: {
  taskId: string;
  taskInfo?: AITaskInfo | null;
  taskResult?: any;
}): Promise<string | null> {
  const { taskId, taskInfo, taskResult } = params;

  if (hasThumbnail(taskInfo, taskResult)) {
    return (
      taskResult?.cover_url ||
      taskResult?.coverUrl ||
      taskResult?.saved_last_frame_image ||
      taskResult?.last_frame_image ||
      taskResult?.saved_last_frame_url ||
      taskResult?.last_frame_url ||
      taskResult?.poster ||
      null
    );
  }

  const videoUrl = pickVideoUrl(taskInfo, taskResult);
  if (!videoUrl) {
    return null;
  }

  const ffmpegAvailable = await checkFfmpegAvailable();
  if (!ffmpegAvailable) {
    console.warn("[VideoThumbnail] ffmpeg not available, skip thumbnail extraction");
    return null;
  }

  let tempDir = "";

  try {
    const configs = await getAllConfigs();
    const storageService = await getStorageService(configs);

    tempDir = await mkdtemp(join(tmpdir(), "video-thumbnail-"));
    const outputPath = join(tempDir, "thumb.png");

    await extractFrameFromVideoUrl({
      videoUrl,
      outputPath,
    });

    const buffer = await readFile(outputPath);
    const uploadResult = await storageService.uploadFile({
      body: buffer,
      key: deriveThumbnailKeyFromVideoUrl({
        videoUrl,
        uploadPath: configs.r2_upload_path,
        fallbackTaskId: taskId,
      }),
      contentType: "image/png",
      disposition: "inline",
    });

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(uploadResult.error || "thumbnail upload failed");
    }

    return replaceR2Url(uploadResult.url);
  } catch (error) {
    console.error("[VideoThumbnail] failed to generate/upload thumbnail:", {
      taskId,
      videoUrl,
      error,
    });
    return null;
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
