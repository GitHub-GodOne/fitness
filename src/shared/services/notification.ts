import { nanoid } from 'nanoid';

import { createNotification } from '@/shared/models/notification';

export interface CreateNotificationParams {
    userId: string;
    type: 'comment_reply' | 'video_complete' | 'image_complete';
    title: string;
    content: string;
    link?: string;
    metadata?: Record<string, any>;
}

export async function createUserNotification(params: CreateNotificationParams) {
    try {
        await createNotification({
            id: nanoid(),
            userId: params.userId,
            type: params.type,
            title: params.title,
            content: params.content,
            link: params.link || null,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
            isRead: false,
        });
    } catch (error) {
        console.error('[Notification Service] Failed to create notification:', error);
    }
}

export async function notifyCommentReply({
    userId,
    commentId,
    replyId,
    replyUserName,
    commentContent,
}: {
    userId: string;
    commentId: string;
    replyId: string;
    replyUserName: string;
    commentContent: string;
}) {
    await createUserNotification({
        userId,
        type: 'comment_reply',
        title: 'New reply to your comment',
        content: `${replyUserName} replied to your comment`,
        link: `/comments?highlight=${commentId}&reply=${replyId}`,
        metadata: {
            commentId,
            replyId,
            replyUserName,
            commentContent: commentContent.substring(0, 100),
        },
    });
}

export async function notifyVideoComplete({
    userId,
    taskId,
    videoUrl,
    prompt,
}: {
    userId: string;
    taskId: string;
    videoUrl: string;
    prompt?: string;
}) {
    await createUserNotification({
        userId,
        type: 'video_complete',
        title: 'Video generation completed',
        content: 'Your video has been generated successfully',
        link: `/activity/ai-tasks?highlight=${taskId}`,
        metadata: {
            taskId,
            videoUrl,
            prompt: prompt?.substring(0, 100),
        },
    });
}

export async function notifyImageComplete({
    userId,
    taskId,
    imageUrl,
    prompt,
}: {
    userId: string;
    taskId: string;
    imageUrl: string;
    prompt?: string;
}) {
    await createUserNotification({
        userId,
        type: 'image_complete',
        title: 'Image generation completed',
        content: 'Your image has been generated successfully',
        link: `/activity/ai-tasks?highlight=${taskId}`,
        metadata: {
            taskId,
            imageUrl,
            prompt: prompt?.substring(0, 100),
        },
    });
}
