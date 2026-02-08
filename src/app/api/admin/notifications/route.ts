import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
    getAdminNotifications,
    getAdminNotificationsCount,
} from '@/shared/models/notification';
import { hasPermission } from '@/shared/services/rbac';
import { createBroadcastNotification, notifySystemMessage } from '@/shared/services/notification';

export async function GET(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const canView = await hasPermission(user.id, 'admin.notifications.read');
        if (!canView) {
            return respErr('no permission', 403);
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '30', 10);

        const total = await getAdminNotificationsCount({ type });
        const notifications = await getAdminNotifications({ type, page, limit });

        return respData({
            notifications,
            total,
            page,
            limit,
        });
    } catch (e: any) {
        console.error('[Admin Notifications] GET failed:', e);
        return respErr(e.message || 'Failed to get notifications', 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const canWrite = await hasPermission(user.id, 'admin.notifications.write');
        if (!canWrite) {
            return respErr('no permission', 403);
        }

        const body = await req.json();
        const { targetType, targetUserIds, title, content, link } = body;

        if (!title || !content) {
            return respErr('title and content are required');
        }

        if (targetType === 'specific' && targetUserIds?.length > 0) {
            for (const userId of targetUserIds) {
                await notifySystemMessage({ userId, title, content, link });
            }
        } else {
            await createBroadcastNotification({
                targetType: targetType || 'all',
                targetUserIds,
                title,
                content,
                link,
            });
        }

        return respData({ success: true });
    } catch (e: any) {
        console.error('[Admin Notifications] POST failed:', e);
        return respErr(e.message || 'Failed to create notification', 500);
    }
}
