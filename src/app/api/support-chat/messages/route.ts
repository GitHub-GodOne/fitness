import { generateId } from 'ai';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import {
  createSupportChatMessage,
  getSupportChatMessagesByUserId,
  SupportChatMessageStatus,
  SupportChatMessageType,
} from '@/shared/models/support_chat_message';

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const messages = await getSupportChatMessagesByUserId(
      user.id,
      SupportChatMessageStatus.ACTIVE
    );

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

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { content } = await req.json();
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return respErr('content is required');
    }

    const message = await createSupportChatMessage({
      id: generateId().toLowerCase(),
      userId: user.id,
      content: content.trim(),
      type: SupportChatMessageType.USER,
      status: SupportChatMessageStatus.ACTIVE,
      read: false,
    });

    return respData({
      id: message.id,
      content: message.content,
      type: message.type,
      read: message.read,
      createdAt: message.createdAt,
    });
  } catch (error: any) {
    console.error('Failed to send support chat message:', error);
    return respErr(error.message || 'Failed to send message');
  }
}
