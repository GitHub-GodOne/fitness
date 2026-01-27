import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import {
    getNotifications,
    getNotificationsCount,
    getUnreadCount,
} from '@/shared/models/notification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user?.id) {
            return respErr('Unauthorized', 401);
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const isReadParam = searchParams.get('isRead');
        const type = searchParams.get('type') || undefined;

        const isRead = isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;

        const [notifications, total, unreadCount] = await Promise.all([
            getNotifications({
                userId: session.user.id,
                isRead,
                type,
                page,
                limit,
            }),
            getNotificationsCount({
                userId: session.user.id,
                isRead,
                type,
            }),
            getUnreadCount(session.user.id),
        ]);

        return respData({
            data: notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                unreadCount,
            },
        });
    } catch (error) {
        console.error('[Notifications List] Error:', error);
        return respErr('Failed to fetch notifications', 500);
    }
}
