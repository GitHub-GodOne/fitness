import { replaceR2Url } from '@/shared/lib/url';

function parseJson(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseNestedJsonString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeImageUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return replaceR2Url(value.trim());
}

function pickFirstVideoUrl(value: any): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string') || value[0];
    if (!first) {
      return null;
    }

    if (typeof first === 'string') {
      return first;
    }

    return (
      first.url ??
      first.uri ??
      first.video ??
      first.src ??
      first.videoUrl ??
      null
    );
  }

  return (
    value.url ?? value.uri ?? value.video ?? value.src ?? value.videoUrl ?? null
  );
}

function looksLikeVideoAsset(value: string) {
  const normalized = value.toLowerCase().split('?')[0].split('#')[0];

  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/') ||
    normalized.includes('.mp4') ||
    normalized.includes('.mov') ||
    normalized.includes('.webm') ||
    normalized.includes('.m4v')
  );
}

function collectMatchingVideoUrls(value: any, matcher: (value: string) => boolean) {
  const matches: string[] = [];
  const visited = new Set<any>();

  function walk(node: any) {
    if (!node || visited.has(node)) {
      return;
    }

    if (typeof node === 'string') {
      if (looksLikeVideoAsset(node) && matcher(node)) {
        matches.push(node);
      }
      return;
    }

    if (typeof node !== 'object') {
      return;
    }

    visited.add(node);

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const directUrl = pickFirstVideoUrl(node);
    if (directUrl && looksLikeVideoAsset(directUrl) && matcher(directUrl)) {
      matches.push(directUrl);
    }

    Object.values(node).forEach(walk);
  }

  walk(value);
  return matches;
}

export function extractVideoUrlFromAITask(params: {
  taskInfo?: string | null;
  taskResult?: string | null;
}) {
  const taskResult = parseJson(params.taskResult);
  const taskInfo = parseJson(params.taskInfo);
  const preferredFinalVideoUrl =
    collectMatchingVideoUrls(taskResult, (value) =>
      value.toLowerCase().includes('final_video.mp4')
    )[0] ||
    collectMatchingVideoUrls(taskInfo, (value) =>
      value.toLowerCase().includes('final_video.mp4')
    )[0];

  const url =
    preferredFinalVideoUrl ||
    taskResult?.saved_video_url ||
    pickFirstVideoUrl(taskResult?.saved_video_urls) ||
    taskResult?.original_video_url ||
    pickFirstVideoUrl(taskResult?.original_video_urls) ||
    taskResult?.content?.video_url ||
    pickFirstVideoUrl(taskInfo?.videos) ||
    pickFirstVideoUrl(taskResult?.videos) ||
    pickFirstVideoUrl(taskResult?.output);

  return url ? replaceR2Url(url) : null;
}

export function extractVideoCoverFromAITask(taskResult?: string | null) {
  const result = parseJson(taskResult);
  const matchedVideoCover =
    result?.matchedVideos?.find?.(
      (item: any) => item?.thumbnailUrl || item?.thumbnail_url
    )?.thumbnailUrl ||
    result?.matchedVideos?.find?.(
      (item: any) => item?.thumbnailUrl || item?.thumbnail_url
    )?.thumbnail_url ||
    null;
  const cover =
    matchedVideoCover ||
    result?.videos?.[0]?.thumbnailUrl ||
    result?.videos?.[0]?.thumbnail_url ||
    result?.content?.thumbnail_url ||
    result?.content?.thumbnailUrl ||
    result?.last_frame_image ||
    result?.saved_last_frame_image ||
    result?.saved_last_frame_url ||
    result?.last_frame_url ||
    result?.poster ||
    result?.cover_url ||
    result?.coverUrl ||
    result?.input_image_url ||
    result?.inputImageUrl ||
    null;

  return cover ? replaceR2Url(cover) : null;
}

export function extractOriginalImageUrlsFromAITask(params: {
  taskInfo?: string | null;
  taskResult?: string | null;
}) {
  const result = parseJson(params.taskResult);
  const info = parseJson(params.taskInfo);

  const preferredInputImage = normalizeImageUrl(
    result?.input_image_url || info?.inputImageUrl
  );

  const originalImages = Array.isArray(result?.original_image_urls)
    ? result.original_image_urls
        .map((item: unknown) => normalizeImageUrl(item))
        .filter((item: string | null): item is string => Boolean(item))
    : [];

  if (preferredInputImage) {
    return [
      preferredInputImage,
      ...originalImages.filter((url: string) => url !== preferredInputImage),
    ];
  }

  return originalImages;
}

export function extractShowcaseTitleFromAITask(params: {
  prompt?: string | null;
  taskResult?: string | null;
}) {
  const result = parseJson(params.taskResult);

  if (result?.verse_reference && typeof result.verse_reference === 'string') {
    return result.verse_reference;
  }

  const prompt = params.prompt?.trim();
  if (!prompt) {
    return 'Untitled Video';
  }

  return prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt;
}

export function extractShowcaseDescriptionFromAITask(params: {
  prompt?: string | null;
  taskResult?: string | null;
}) {
  const result = parseJson(params.taskResult);

  if (result?.narration && typeof result.narration === 'string') {
    return result.narration;
  }

  return params.prompt?.trim() || '';
}

export function extractVerseReferenceFromAITask(params: {
  options?: string | null;
  taskResult?: string | null;
}) {
  const result = parseJson(params.taskResult);
  if (typeof result?.verse_reference === 'string' && result.verse_reference.trim()) {
    return result.verse_reference.trim();
  }

  const options = parseJson(params.options);
  const finalPrompt =
    typeof options?.final_prompt === 'string' ? options.final_prompt : null;
  const analysis = parseNestedJsonString(finalPrompt);

  if (
    typeof analysis?.verse_reference === 'string' &&
    analysis.verse_reference.trim()
  ) {
    return analysis.verse_reference.trim();
  }

  return '';
}

export function extractFinalPromptFromAITask(params: {
  options?: string | null;
  taskResult?: string | null;
}) {
  const result = parseJson(params.taskResult);
  if (typeof result?.narration === 'string' && result.narration.trim()) {
    return result.narration.trim();
  }

  const options = parseJson(params.options);
  const finalPrompt =
    typeof options?.final_prompt === 'string' ? options.final_prompt : '';

  return finalPrompt.trim();
}
