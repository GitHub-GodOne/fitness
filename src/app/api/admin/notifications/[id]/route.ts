import { NextRequest } from 'next/server';

import { respData, respErr, respOk } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
    findNotificationById,
    updateNotification,
    deleteNotification,
} from '@/shared/models/notification';
import { hasPermission } from '@/shared/services/rbac';

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const canWrite = await hasPermission(user.id, 'admin.notifications.write');
        if (!canWrite) {
            return respErr('no permission', 403);
        }

        const { id } = await params;
        const existing = await findNotificationById(id);
        if (!existing) {
            return respErr('notification not found', 404);
        }

        const body = await req.json();
        const { title, content, link } = body;

        const updated = await updateNotification(id, {
            title: title || existing.title,
            content: content || existing.content,
            link: link !== undefined ? link : existing.link,
        });

        return respData(updated);
    } catch (e: any) {
        console.error('[Admin Notifications] PUT failed:', e);
        return respErr(e.message || 'Failed to update notification', 500);
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const canDelete = await hasPermission(user.id, 'admin.notifications.delete');
        if (!canDelete) {
            return respErr('no permission', 403);
        }

        const { id } = await params;
        const existing = await findNotificationById(id);
        if (!existing) {
            return respErr('notification not found', 404);
        }

        await deleteNotification(id);
        return respOk();
    } catch (e: any) {
        console.error('[Admin Notifications] DELETE failed:', e);
        return respErr(e.message || 'Failed to delete notification', 500);
    }
}
