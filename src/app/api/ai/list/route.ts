import { NextRequest } from 'next/server';

import { getAllConfigs } from '@/shared/models/config';
import { respData, respErr } from '@/shared/lib/resp';
import { canViewFullHistoryForTask } from '@/shared/lib/history-visibility';
import { getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import {
    hydrateVideoLibraryTaskResult,
    limitVideoLibraryTaskResultAngles,
} from '@/shared/lib/video-library-task-result';
import { getCurrentSubscription, getSubscriptions } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { AIMediaType } from '@/extensions/ai/types';

async function enrichVideoLibraryTaskThumbnails<T extends {
    configs?: any;
    createdAt?: Date | string | null;
    currentSubscription?: any;
    options?: string | null;
    provider?: string | null;
    subscriptions?: any[];
    taskResult?: string | null;
    userId?: string | null;
}>(tasks: T[]) {
    return Promise.all(
        tasks.map(async (task) => {
            if (task.provider !== 'video-library' || !task.taskResult) {
                return task;
            }

            const hydratedTaskResult = await hydrateVideoLibraryTaskResult(
                task.taskResult,
            );

            return {
                ...task,
                taskResult: limitVideoLibraryTaskResultAngles(
                    hydratedTaskResult,
                    task.userId
                        ? canViewFullHistoryForTask({
                            taskCreatedAt: task.createdAt,
                            taskOptions: task.options,
                            currentSubscription: task.currentSubscription as any,
                            subscriptions: task.subscriptions as any,
                            configs: task.configs as any,
                        })
                        : false,
                ),
            };
        })
    );
}

export async function GET(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const [configs, currentSubscription, subscriptions] = await Promise.all([
            getAllConfigs(),
            getCurrentSubscription(user.id),
            getSubscriptions({
                userId: user.id,
                page: 1,
                limit: 200,
            }),
        ]);

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
        const enrichedTasks = await enrichVideoLibraryTaskThumbnails(
            tasks.map((task) => ({
                ...task,
                currentSubscription,
                subscriptions,
                configs,
            }))
        );

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

        const [configs, currentSubscription, subscriptions] = await Promise.all([
            getAllConfigs(),
            getCurrentSubscription(user.id),
            getSubscriptions({
                userId: user.id,
                page: 1,
                limit: 200,
            }),
        ]);

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
        const enrichedTasks = await enrichVideoLibraryTaskThumbnails(
            tasks.map((task) => ({
                ...task,
                currentSubscription,
                subscriptions,
                configs,
            }))
        );

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
