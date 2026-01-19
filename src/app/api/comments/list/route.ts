import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import {
    getComments,
    getCommentsCount,
    isCommentLikedByUser,
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
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const sortBy = (searchParams.get('sort') || 'time') as 'time' | 'hot';

        // Get comments using model
        const comments = await getComments({
            status: 'visible',
            visibility: 'public',
            page,
            limit,
            sortBy,
        });

        // Get total count
        const total = await getCommentsCount({
            status: 'visible',
            visibility: 'public',
        });

        // If user is logged in, check which comments they've liked
        const commentsWithLikes = await Promise.all(
            comments.map(async (c) => {
                let liked = false;
                if (session?.user?.id) {
                    liked = await isCommentLikedByUser({
                        commentId: c.id,
                        userId: session.user.id,
                    });
                }

                return {
                    ...c,
                    isLikedByUser: liked,
                };
            })
        );

        return respData({
            data: commentsWithLikes,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        return respErr('Failed to fetch comments');
    }
}
