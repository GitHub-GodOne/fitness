import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { AIMediaType } from '@/extensions/ai/types';
import {
    getFitnessVideoGroupById,
    getVideoMappings,
} from '@/shared/models/video_library';

function parseJsonSafely(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

async function enrichVideoLibraryTaskThumbnails<T extends {
    provider?: string | null;
    taskResult?: string | null;
}>(tasks: T[]) {
    const videoLibraryTasks = tasks.filter((task) => task.provider === 'video-library');
    if (videoLibraryTasks.length === 0) {
        return tasks;
    }

    const missingGroupIds = new Set<string>();

    for (const task of videoLibraryTasks) {
        const result = parseJsonSafely(task.taskResult);
        const matchedVideos = Array.isArray(result?.matchedVideos) ? result.matchedVideos : [];

        for (const item of matchedVideos) {
            const hasThumbnail = Boolean(item?.thumbnailUrl || item?.thumbnail_url);
            if (!hasThumbnail && typeof item?.id === 'string' && item.id.trim()) {
                missingGroupIds.add(item.id.trim());
            }
        }
    }

    if (missingGroupIds.size === 0) {
        return tasks;
    }

    const groupEntries = await Promise.all(
        Array.from(missingGroupIds).map(async (groupId) => {
            const group = await getFitnessVideoGroupById(groupId);
            const mappings = await getVideoMappings(groupId);
            const workoutItems = Array.from(
                new Set(
                    mappings
                        .map((item) => item.object?.nameZh || item.object?.name || '')
                        .filter(Boolean)
                )
            );

            return [
                groupId,
                {
                    thumbnailUrl: group?.thumbnailUrl || null,
                    workoutItems,
                },
            ] as const;
        })
    );

    const groupMetaMap = new Map(groupEntries);

    if (groupMetaMap.size === 0) {
        return tasks;
    }

    return tasks.map((task) => {
        if (task.provider !== 'video-library' || !task.taskResult) {
            return task;
        }

        const result = parseJsonSafely(task.taskResult);
        const matchedVideos = Array.isArray(result?.matchedVideos) ? result.matchedVideos : null;
        if (!matchedVideos) {
            return task;
        }

        let changed = false;
        const taskWorkoutItems = new Set<string>();
        const nextMatchedVideos = matchedVideos.map((item: any) => {
            if (typeof item?.id !== 'string') {
                return item;
            }

            const groupMeta = groupMetaMap.get(item.id);
            if (!groupMeta) {
                return item;
            }

            const nextItem = {
                ...item,
                thumbnailUrl:
                    item?.thumbnailUrl || item?.thumbnail_url || groupMeta.thumbnailUrl || '',
                workoutItems:
                    Array.isArray(item?.workoutItems) && item.workoutItems.length > 0
                        ? item.workoutItems
                        : groupMeta.workoutItems,
            };

            if (
                nextItem.thumbnailUrl !== item?.thumbnailUrl ||
                JSON.stringify(nextItem.workoutItems || []) !== JSON.stringify(item?.workoutItems || [])
            ) {
                changed = true;
            }

            for (const workoutItem of nextItem.workoutItems || []) {
                if (workoutItem) {
                    taskWorkoutItems.add(workoutItem);
                }
            }

            return nextItem;
        });

        if (!changed) {
            return task;
        }

        return {
            ...task,
            taskResult: JSON.stringify({
                ...result,
                workoutItems: Array.from(taskWorkoutItems),
                matchedVideos: nextMatchedVideos,
            }),
        };
    });
}

export async function GET(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const searchParams = req.nextUrl.searchParams;
        const page = Math.max(1, Number(searchParams.get('page') || 1));
        const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit') || 10)));
        const mediaType = searchParams.get('mediaType') || AIMediaType.VIDEO;
        const status = searchParams.get('status');

        const [tasks, total] = await Promise.all([
            getAITasks({
                userId: user.id,
                mediaType: mediaType as string,
                page,
                limit,
                status: status || undefined,
            }),
            getAITasksCount({
                userId: user.id,
                mediaType: mediaType as string,
                status: status || undefined,
            }),
        ]);
        const enrichedTasks = await enrichVideoLibraryTaskThumbnails(tasks);

        const hasMore = page * limit < total;

        return respData({
            data: enrichedTasks,
            total,
            page,
            limit,
            hasMore,
        });
    } catch (e: any) {
        console.log('get ai tasks list failed', e);
        return respErr(e.message);
    }
}

export async function POST(req: Request) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const { page = 1, limit = 10, mediaType = AIMediaType.VIDEO, status } = await req.json();

        const safePage = Math.max(1, Number(page));
        const safeLimit = Math.max(1, Math.min(100, Number(limit)));

        const [tasks, total] = await Promise.all([
            getAITasks({
                userId: user.id,
                mediaType: mediaType as string,
                page: safePage,
                limit: safeLimit,
                status: status || undefined,
            }),
            getAITasksCount({
                userId: user.id,
                mediaType: mediaType as string,
                status: status || undefined,
            }),
        ]);
        const enrichedTasks = await enrichVideoLibraryTaskThumbnails(tasks);

        const hasMore = safePage * safeLimit < total;

        return respData({
            list: enrichedTasks,
            total,
            page: safePage,
            limit: safeLimit,
            hasMore,
        });
    } catch (e: any) {
        console.log('get ai tasks list failed', e);
        return respErr(e.message);
    }
}
