import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { AIMediaType } from '@/extensions/ai/types';

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

        const hasMore = page * limit < total;

        return respData({
            data: tasks,
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

        const hasMore = safePage * safeLimit < total;

        return respData({
            list: tasks,
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

