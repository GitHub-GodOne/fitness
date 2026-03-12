import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { supportChatMessage, user } from '@/config/db/schema';

import { appendUserToResult, User } from './user';

export enum SupportChatMessageStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export enum SupportChatMessageType {
  USER = 'user',
  ADMIN = 'admin',
}

export type SupportChatMessage = typeof supportChatMessage.$inferSelect & {
  user?: User;
};
export type NewSupportChatMessage = typeof supportChatMessage.$inferInsert;
export type UpdateSupportChatMessage = Partial<
  Omit<NewSupportChatMessage, 'id' | 'createdAt'>
>;

export async function createSupportChatMessage(
  newMessage: NewSupportChatMessage
): Promise<SupportChatMessage> {
  const [result] = await db()
    .insert(supportChatMessage)
    .values(newMessage)
    .returning();

  return result;
}

export async function getSupportChatMessages({
  userId,
  status = SupportChatMessageStatus.ACTIVE,
  page = 1,
  limit = 50,
  getUser = false,
}: {
  userId?: string;
  status?: SupportChatMessageStatus;
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<SupportChatMessage[]> {
  const result = await db()
    .select()
    .from(supportChatMessage)
    .where(
      and(
        userId ? eq(supportChatMessage.userId, userId) : undefined,
        eq(supportChatMessage.status, status)
      )
    )
    .orderBy(asc(supportChatMessage.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

export async function getSupportChatMessagesByUserId(
  userId: string,
  status: SupportChatMessageStatus = SupportChatMessageStatus.ACTIVE
): Promise<SupportChatMessage[]> {
  const result = await db()
    .select()
    .from(supportChatMessage)
    .where(
      and(
        eq(supportChatMessage.userId, userId),
        eq(supportChatMessage.status, status)
      )
    )
    .orderBy(asc(supportChatMessage.createdAt));

  return result;
}

export async function getAllSupportChatMessages({
  status = SupportChatMessageStatus.ACTIVE,
  page = 1,
  limit = 50,
  getUser = false,
}: {
  status?: SupportChatMessageStatus;
  page?: number;
  limit?: number;
  getUser?: boolean;
}): Promise<SupportChatMessage[]> {
  const result = await db()
    .select()
    .from(supportChatMessage)
    .where(eq(supportChatMessage.status, status))
    .orderBy(desc(supportChatMessage.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

export async function getUsersWithSupportMessages(): Promise<
  { userId: string; user?: User; lastMessageAt: Date; unreadCount: number }[]
> {
  const db_ = db();
  const result = await db_.execute<{
    user_id: string;
    last_message_at: string;
    unread_count: string;
  }>(`
    SELECT 
      user_id,
      MAX(created_at) as last_message_at,
      COUNT(CASE WHEN type = 'user' AND read = false THEN 1 END) as unread_count
    FROM support_chat_message
    WHERE status = 'active'
    GROUP BY user_id
    ORDER BY last_message_at DESC
  `);

  const rows = Array.isArray(result) ? result : [];

  const userIds = rows.map((r) => r.user_id);
  if (userIds.length === 0) return [];

  const users = await db()
    .select()
    .from(user)
    .where(inArray(user.id, userIds));

  const userMap = new Map<string, User>(
    users.map((u) => [u.id, u as User])
  );

  return rows.map((row) => ({
    userId: row.user_id,
    user: userMap.get(row.user_id) as User | undefined,
    lastMessageAt: new Date(row.last_message_at),
    unreadCount: Number(row.unread_count),
  }));
}

export async function markMessagesAsRead(userId: string): Promise<void> {
  await db()
    .update(supportChatMessage)
    .set({ read: true })
    .where(
      and(
        eq(supportChatMessage.userId, userId),
        eq(supportChatMessage.type, SupportChatMessageType.USER),
        eq(supportChatMessage.read, false)
      )
    );
}

export async function updateSupportChatMessage(
  id: string,
  update: UpdateSupportChatMessage
): Promise<SupportChatMessage> {
  const [result] = await db()
    .update(supportChatMessage)
    .set(update)
    .where(eq(supportChatMessage.id, id))
    .returning();

  return result;
}

export async function deleteSupportChatMessage(id: string): Promise<void> {
  await db()
    .update(supportChatMessage)
    .set({ status: SupportChatMessageStatus.DELETED })
    .where(eq(supportChatMessage.id, id));
}
