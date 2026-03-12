import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { notification } from '@/config/db/schema';

export type Notification = typeof notification.$inferSelect;
export type NewNotification = typeof notification.$inferInsert;
export type UpdateNotification = Partial<Omit<NewNotification, 'id' | 'createdAt'>>;

export interface NotificationListResponse {
    data: Notification[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        unreadCount: number;
    };
}

export async function createNotification(newNotification: NewNotification): Promise<Notification> {
    const [result] = await db().insert(notification).values(newNotification).returning();
    return result;
}

export async function findNotificationById(id: string): Promise<Notification | null> {
    const [result] = await db()
        .select()
        .from(notification)
        .where(eq(notification.id, id));
    return result || null;
}

export async function getNotifications({
    userId,
    isRead,
    type,
    page = 1,
    limit = 20,
}: {
    userId: string;
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
}): Promise<Notification[]> {
    const conditions = [eq(notification.userId, userId)];

    if (isRead !== undefined) {
        conditions.push(eq(notification.isRead, isRead));
    }

    if (type) {
        conditions.push(eq(notification.type, type));
    }

    const result = await db()
        .select()
        .from(notification)
        .where(and(...conditions))
        .orderBy(desc(notification.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

    return result;
}

export async function getNotificationsCount({
    userId,
    isRead,
    type,
}: {
    userId: string;
    isRead?: boolean;
    type?: string;
}): Promise<number> {
    const conditions = [eq(notification.userId, userId)];

    if (isRead !== undefined) {
        conditions.push(eq(notification.isRead, isRead));
    }

    if (type) {
        conditions.push(eq(notification.type, type));
    }

    const [result] = await db()
        .select({ count: count() })
        .from(notification)
        .where(and(...conditions));

    return result?.count || 0;
}

export async function getUnreadCount(userId: string): Promise<number> {
    return getNotificationsCount({ userId, isRead: false });
}

export async function markAsRead(id: string): Promise<Notification> {
    const [result] = await db()
        .update(notification)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notification.id, id))
        .returning();

    return result;
}

export async function markAllAsRead(userId: string): Promise<void> {
    await db()
        .update(notification)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notification.userId, userId), eq(notification.isRead, false)));
}

export async function deleteNotification(id: string): Promise<void> {
    await db().delete(notification).where(eq(notification.id, id));
}

export async function deleteAllNotifications(userId: string): Promise<void> {
    await db().delete(notification).where(eq(notification.userId, userId));
}

export async function getAdminNotifications({
    type,
    page = 1,
    limit = 20,
}: {
    type?: string;
    page?: number;
    limit?: number;
}): Promise<Notification[]> {
    const conditions = [];

    if (type) {
        conditions.push(eq(notification.type, type));
    }

    const query = db()
        .select()
        .from(notification)
        .orderBy(desc(notification.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

    if (conditions.length > 0) {
        query.where(and(...conditions));
    }

    return await query;
}

export async function getAdminNotificationsCount({
    type,
}: {
    type?: string;
}): Promise<number> {
    const conditions = [];

    if (type) {
        conditions.push(eq(notification.type, type));
    }

    const query = db()
        .select({ count: count() })
        .from(notification);

    if (conditions.length > 0) {
        query.where(and(...conditions));
    }

    const [result] = await query;
    return result?.count || 0;
}

export async function updateNotification(
    id: string,
    data: { title?: string; content?: string; link?: string | null },
): Promise<Notification> {
    const [result] = await db()
        .update(notification)
        .set(data)
        .where(eq(notification.id, id))
        .returning();
    return result;
}
