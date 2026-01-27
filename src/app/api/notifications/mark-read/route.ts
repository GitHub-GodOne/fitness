import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import {
    markAsRead,
    markAllAsRead,
    findNotificationById,
} from '@/shared/models/notification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user?.id) {
            return respErr('Unauthorized', 401);
        }

        let body;
        try {
            body = await req.json();
        } catch (jsonError) {
            return respErr('Invalid JSON format', 400);
        }

        const { notificationId, markAll } = body;

        if (markAll) {
            await markAllAsRead(session.user.id);
            return respData({ message: 'All notifications marked as read' });
        }

        if (!notificationId) {
            return respErr('Notification ID is required', 400);
        }

        const notification = await findNotificationById(notificationId);
        if (!notification) {
            return respErr('Notification not found', 404);
        }

        if (notification.userId !== session.user.id) {
            return respErr('Unauthorized', 403);
        }

        await markAsRead(notificationId);
        return respData({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('[Notifications Mark Read] Error:', error);
        return respErr('Failed to mark notification as read', 500);
    }
}
