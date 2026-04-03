import {
  getFitnessVideoGroupById,
  getVideoMappings,
  listFitnessVideosByGroup,
} from '@/shared/models/video_library';

function parseJsonSafely<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function hydrateVideoLibraryTaskResult(
  taskResult: string | null | undefined,
): Promise<string | null | undefined> {
  if (!taskResult) {
    return taskResult;
  }

  const parsed = parseJsonSafely<Record<string, any>>(taskResult);
  const matchedVideos = Array.isArray(parsed?.matchedVideos)
    ? parsed.matchedVideos
    : null;

  if (!parsed || !matchedVideos || matchedVideos.length === 0) {
    return taskResult;
  }

  const groupIds = Array.from(
    new Set(
      matchedVideos
        .map((item) =>
          typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : '',
        )
        .filter(Boolean),
    ),
  );

  if (groupIds.length === 0) {
    return taskResult;
  }

  const groupEntries = await Promise.all(
    groupIds.map(async (groupId) => {
      const [group, videos, mappings] = await Promise.all([
        getFitnessVideoGroupById(groupId),
        listFitnessVideosByGroup(groupId),
        getVideoMappings(groupId),
      ]);

      const workoutItems = Array.from(
        new Set(
          mappings
            .map((item) => item.object?.nameZh || item.object?.name || '')
            .filter(Boolean),
        ),
      );

      return [
        groupId,
        {
          group,
          videos: videos.map((video) => ({
            id: video.id,
            videoUrl: video.videoUrl,
            viewAngle: video.viewAngle,
            viewAngleZh: video.viewAngleZh,
            duration: video.duration,
          })),
          workoutItems,
        },
      ] as const;
    }),
  );

  const groupMetaMap = new Map(groupEntries);

  let changed = false;
  const nextWorkoutItems = new Set<string>();

  const nextMatchedVideos = matchedVideos.map((item) => {
    if (typeof item?.id !== 'string') {
      return item;
    }

    const groupMeta = groupMetaMap.get(item.id);
    if (!groupMeta?.group) {
      return item;
    }

    const nextItem = {
      ...item,
      title: groupMeta.group.title || item.title,
      titleZh: groupMeta.group.titleZh || item.titleZh,
      description: groupMeta.group.description || item.description,
      descriptionZh: groupMeta.group.descriptionZh || item.descriptionZh,
      thumbnailUrl:
        groupMeta.group.thumbnailUrl ||
        item.thumbnailUrl ||
        item.thumbnail_url ||
        '',
      difficulty: groupMeta.group.difficulty || item.difficulty,
      instructions: groupMeta.group.instructions || item.instructions,
      instructionsZh: groupMeta.group.instructionsZh || item.instructionsZh,
      videos:
        groupMeta.videos.length > 0
          ? groupMeta.videos
          : Array.isArray(item.videos)
            ? item.videos
            : [],
      workoutItems:
        Array.isArray(item.workoutItems) && item.workoutItems.length > 0
          ? item.workoutItems
          : groupMeta.workoutItems,
    };

    for (const workoutItem of nextItem.workoutItems || []) {
      if (workoutItem) {
        nextWorkoutItems.add(workoutItem);
      }
    }

    if (JSON.stringify(nextItem) !== JSON.stringify(item)) {
      changed = true;
    }

    return nextItem;
  });

  const nextResult = {
    ...parsed,
    matchedVideos: nextMatchedVideos,
    workoutItems:
      nextWorkoutItems.size > 0
        ? Array.from(nextWorkoutItems)
        : parsed.workoutItems,
  };

  const nextSerialized = JSON.stringify(nextResult);
  return changed || nextSerialized !== taskResult ? nextSerialized : taskResult;
}

export function limitVideoLibraryTaskResultAngles(
  taskResult: string | null | undefined,
  hasActiveSubscription: boolean,
): string | null | undefined {
  if (!taskResult || hasActiveSubscription) {
    return taskResult;
  }

  const parsed = parseJsonSafely<Record<string, any>>(taskResult);
  const matchedVideos = Array.isArray(parsed?.matchedVideos)
    ? parsed.matchedVideos
    : null;

  if (!parsed || !matchedVideos) {
    return taskResult;
  }

  const nextMatchedVideos = matchedVideos.map((group) => ({
    ...group,
    videos: Array.isArray(group?.videos) ? group.videos.slice(0, 1) : group?.videos,
  }));

  const nextSerialized = JSON.stringify({
    ...parsed,
    matchedVideos: nextMatchedVideos,
  });

  return nextSerialized === taskResult ? taskResult : nextSerialized;
}
