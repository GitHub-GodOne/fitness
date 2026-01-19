import { nanoid } from 'nanoid';
import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { comment, commentReply } from '@/config/db/schema';
import { getClientIp } from '@/shared/lib/ip';
import { respData, respErr } from '@/shared/lib/resp';
import {
    findCommentLike,
    createCommentLike,
    deleteCommentLike,
} from '@/shared/models/comment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user?.id) {
            return respErr('Login required to like');
        }

        const body = await req.json();
        const { commentId, replyId } = body;

        if (!commentId && !replyId) {
            return respErr('Comment ID or Reply ID is required');
        }

        const userId = session.user.id;
        const ipAddress = await getClientIp();

        // Check if already liked using model
        const existing = await findCommentLike({
            commentId: commentId || undefined,
            replyId: replyId || undefined,
            userId,
        });

        if (existing) {
            // Unlike - delete like and update count
            await deleteCommentLike(existing.id);

            // Update like count
            if (commentId) {
                await db()
                    .update(comment)
                    .set({ likes: sql`${comment.likes} - 1` })
                    .where(sql`${comment.id} = ${commentId}`);
            } else if (replyId) {
                await db()
                    .update(commentReply)
                    .set({ likes: sql`${commentReply.likes} - 1` })
                    .where(sql`${commentReply.id} = ${replyId}`);
            }

            return respData({ liked: false, message: 'Unliked successfully' });
        } else {
            // Like - create like record and update count
            await createCommentLike({
                id: nanoid(),
                commentId: commentId || null,
                replyId: replyId || null,
                userId,
                ipAddress,
            });

            // Update like count
            if (commentId) {
                await db()
                    .update(comment)
                    .set({ likes: sql`${comment.likes} + 1` })
                    .where(sql`${comment.id} = ${commentId}`);
            } else if (replyId) {
                await db()
                    .update(commentReply)
                    .set({ likes: sql`${commentReply.likes} + 1` })
                    .where(sql`${commentReply.id} = ${replyId}`);
            }

            return respData({ liked: true, message: 'Liked successfully' });
        }
    } catch (error) {
        console.error('Error liking comment:', error);
        return respErr('Operation failed');
    }
}
