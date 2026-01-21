import { nanoid } from 'nanoid';
import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { getClientIp } from '@/shared/lib/ip';
import { respData, respErr } from '@/shared/lib/resp';
import {
    createCommentReply,
    findCommentById,
} from '@/shared/models/comment';
import { notifyCommentReply } from '@/shared/services/notification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        // Parse JSON body with error handling
        let body;
        try {
            body = await req.json();
        } catch (jsonError) {
            console.error('[Comments Reply] JSON parse error:', jsonError);
            return Response.json(
                { code: -1, message: 'Invalid JSON format' },
                { status: 400 }
            );
        }

        const { commentId, parentReplyId, content, userName, userEmail } = body;

        // Validate input - return 400 for validation errors
        if (!commentId) {
            return Response.json(
                { code: -1, message: 'Comment ID is required' },
                { status: 400 }
            );
        }

        if (!content || content.trim().length === 0) {
            return Response.json(
                { code: -1, message: 'Reply content is required' },
                { status: 400 }
            );
        }

        if (content.length > 2000) {
            return Response.json(
                { code: -1, message: 'Reply content is too long (max 2000 characters)' },
                { status: 400 }
            );
        }

        // For anonymous users, email and name are required
        if (!session?.user?.id) {
            if (!userEmail || !userName) {
                return Response.json(
                    { code: -1, message: 'Name and email are required for anonymous users' },
                    { status: 400 }
                );
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userEmail)) {
                return Response.json(
                    { code: -1, message: 'Invalid email format' },
                    { status: 400 }
                );
            }
        }

        // Verify comment exists using model
        let parentComment;
        try {
            parentComment = await findCommentById(commentId);
            if (!parentComment) {
                return Response.json(
                    { code: -1, message: 'Comment not found' },
                    { status: 404 }
                );
            }
        } catch (dbError) {
            console.error('[Comments Reply] Database error finding comment:', dbError);
            return Response.json(
                { code: -1, message: 'Failed to verify parent comment' },
                { status: 500 }
            );
        }

        const userId = session?.user?.id || null;
        const finalUserName = session?.user?.name || userName;
        const finalUserEmail = session?.user?.email || userEmail;
        const finalUserAvatar = session?.user?.image || null;

        const ipAddress = await getClientIp();
        const userAgent = req.headers.get('user-agent') || '';

        // Create reply using model (automatically increments reply count)
        try {
            const newReply = await createCommentReply({
                id: nanoid(),
                commentId,
                parentReplyId: parentReplyId || null,
                userId,
                userName: finalUserName,
                userEmail: finalUserEmail,
                userAvatar: finalUserAvatar,
                content: content.trim(),
                status: 'visible',
                ipAddress,
                userAgent,
            });

            // Send notification to comment author (if they have a userId and it's not the same person)
            if (parentComment.userId && parentComment.userId !== userId) {
                try {
                    await notifyCommentReply({
                        userId: parentComment.userId,
                        commentId,
                        replyId: newReply.id,
                        replyUserName: finalUserName,
                        commentContent: content.trim(),
                    });
                } catch (notifyError) {
                    console.error('[Comments Reply] Failed to send notification:', notifyError);
                }
            }

            return respData({
                id: newReply.id,
                message: 'Reply created successfully',
            });
        } catch (dbError) {
            console.error('[Comments Reply] Database error creating reply:', dbError);
            return Response.json(
                { code: -1, message: 'Failed to create reply due to database error' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[Comments Reply] Unexpected error:', error);
        return Response.json(
            { code: -1, message: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
