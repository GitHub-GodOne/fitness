import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  createSupportChatMessage,
  getSupportChatMessagesByUserId,
  markMessagesAsRead,
  SupportChatMessageStatus,
  SupportChatMessageType,
} from '@/shared/models/support_chat_message';
import { hasPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac';

// Get messages for a specific user (admin only)
export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) {
      return respErr('no permission');
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    if (!targetUserId) {
      return respErr('userId is required');
    }

    const messages = await getSupportChatMessagesByUserId(
      targetUserId,
      SupportChatMessageStatus.ACTIVE
    );

    // Mark messages as read
    await markMessagesAsRead(targetUserId);

    return respData(messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      type: msg.type,
      read: msg.read,
      createdAt: msg.createdAt,
    })));
  } catch (error: any) {
    console.error('Failed to get support chat messages:', error);
    return respErr(error.message || 'Failed to get messages');
  }
}

// Admin reply to user
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) {
      return respErr('no permission');
    }

    const { userId, content } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return respErr('userId is required');
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return respErr('content is required');
    }

    const message = await createSupportChatMessage({
      id: generateId().toLowerCase(),
      userId: userId,
      content: content.trim(),
      type: SupportChatMessageType.ADMIN,
      status: SupportChatMessageStatus.ACTIVE,
      read: true,
    });

    return respData({
      id: message.id,
      content: message.content,
      type: message.type,
      userId: message.userId,
      createdAt: message.createdAt,
    });
  } catch (error: any) {
    console.error('Failed to send admin reply:', error);
    return respErr(error.message || 'Failed to send reply');
  }
}
