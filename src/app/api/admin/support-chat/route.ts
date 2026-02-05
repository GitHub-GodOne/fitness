import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  createSupportChatMessage,
  getAllSupportChatMessages,
  getSupportChatMessagesByUserId,
  getUsersWithSupportMessages,
  markMessagesAsRead,
  SupportChatMessageStatus,
  SupportChatMessageType,
} from '@/shared/models/support_chat_message';
import { hasPermission } from '@/shared/services/rbac';
import { PERMISSIONS } from '@/core/rbac';

// Get all users with support messages (for admin)
export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // Check if user is admin
    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) {
      return respErr('no permission');
    }

    const usersWithMessages = await getUsersWithSupportMessages();

    return respData(usersWithMessages);
  } catch (error: any) {
    console.error('Failed to get support chat users:', error);
    return respErr(error.message || 'Failed to get users');
  }
}

// Admin reply to user
export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    // Check if user is admin
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

    // Create admin reply message
    const message = await createSupportChatMessage({
      id: generateId().toLowerCase(),
      userId: userId,
      content: content.trim(),
      type: SupportChatMessageType.ADMIN,
      status: SupportChatMessageStatus.ACTIVE,
      read: true,
    });

    // Mark user's messages as read
    await markMessagesAsRead(userId);

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
