import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import { getNotifications, getUnreadCount } from '@/shared/models/notification';
import { db } from '@/core/db';
import { notification } from '@/config/db/schema';
import { desc } from 'drizzle-orm';

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

        // Get all notifications for debugging
        const allNotifications = await db()
            .select()
            .from(notification)
            .orderBy(desc(notification.createdAt))
            .limit(10);

        const userNotifications = await getNotifications({
            userId: session.user.id,
            page: 1,
            limit: 10,
        });

        const unreadCount = await getUnreadCount(session.user.id);

        return respData({
            userId: session.user.id,
            userName: session.user.name,
            unreadCount,
            userNotifications,
            allNotifications,
            totalInDb: allNotifications.length,
        });
    } catch (error) {
        console.error('[Debug Notifications] Error:', error);
        return respErr('Failed to debug notifications', 500);
    }
}
