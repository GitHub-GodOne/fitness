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
  const cover =
    result?.last_frame_image ||
    result?.saved_last_frame_image ||
    result?.poster ||
    result?.cover_url ||
    result?.coverUrl ||
    null;

  return cover ? replaceR2Url(cover) : null;
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
