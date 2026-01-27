import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import {
    getCommentReplies,
    getCommentRepliesCount,
    isReplyLikedByUser,
} from '@/shared/models/comment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        const { searchParams } = new URL(req.url);
        const commentId = searchParams.get('commentId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!commentId) {
            return respErr('Comment ID is required');
        }

        // Get replies using model
        const replies = await getCommentReplies({
            commentId,
            status: 'visible',
            page,
            limit,
        });

        // Get total count
        const total = await getCommentRepliesCount({
            commentId,
            status: 'visible',
        });

        // Check if user has liked replies
        const repliesWithLikes = await Promise.all(
            replies.map(async (r) => {
                let liked = false;
                if (session?.user?.id) {
                    liked = await isReplyLikedByUser({
                        replyId: r.id,
                        userId: session.user.id,
                    });
                }

                return {
                    ...r,
                    isLikedByUser: liked,
                };
            })
        );

        return respData({
            data: repliesWithLikes,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching replies:', error);
        return respErr('Failed to fetch replies');
    }
}
