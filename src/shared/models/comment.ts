import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { comment, commentReply, commentLike } from '@/config/db/schema';

import { appendUserToResult, User } from './user';

export type Comment = typeof comment.$inferSelect & {
    user?: User;
    isLikedByUser?: boolean;
};

export type NewComment = typeof comment.$inferInsert;
export type UpdateComment = Partial<Omit<NewComment, 'id' | 'createdAt'>>;

export type CommentReply = typeof commentReply.$inferSelect & {
    user?: User;
    isLikedByUser?: boolean;
};

export type NewCommentReply = typeof commentReply.$inferInsert;
export type UpdateCommentReply = Partial<
    Omit<NewCommentReply, 'id' | 'createdAt'>
>;

export type CommentLike = typeof commentLike.$inferSelect;
export type NewCommentLike = typeof commentLike.$inferInsert;

export interface CommentWithReplies extends Comment {
    replyList?: CommentReply[];
    hasMoreReplies?: boolean;
}

export interface CommentListResponse {
    data: CommentWithReplies[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AITaskReference {
    id: string;
    type: 'video' | 'image' | 'audio' | 'text';
    url: string;
    thumbnail?: string;
    prompt?: string;
}

// Comment CRUD operations
export async function createComment(newComment: NewComment): Promise<Comment> {
    const [result] = await db().insert(comment).values(newComment).returning();
    return result;
}

export async function findCommentById(id: string): Promise<Comment | null> {
    const [result] = await db()
        .select()
        .from(comment)
        .where(eq(comment.id, id));
    return result || null;
}

export async function getComments({
    userId,
    status,
    visibility,
    page = 1,
    limit = 20,
    sortBy = 'time',
    getUser = false,
}: {
    userId?: string;
    status?: string;
    visibility?: string;
    page?: number;
    limit?: number;
    sortBy?: 'time' | 'hot';
    getUser?: boolean;
}): Promise<Comment[]> {
    const orderBy =
        sortBy === 'hot'
            ? [desc(comment.likes), desc(comment.replies), desc(comment.createdAt)]
            : [desc(comment.createdAt)];

    const result = await db()
        .select()
        .from(comment)
        .where(
            and(
                userId ? eq(comment.userId, userId) : undefined,
                status ? eq(comment.status, status) : undefined,
                visibility ? eq(comment.visibility, visibility) : undefined
            )
        )
        .orderBy(...orderBy)
        .limit(limit)
        .offset((page - 1) * limit);

    if (getUser) {
        return appendUserToResult(result);
    }

    return result;
}

export async function getCommentsCount({
    userId,
    status,
    visibility,
}: {
    userId?: string;
    status?: string;
    visibility?: string;
}): Promise<number> {
    const [result] = await db()
        .select({ count: count() })
        .from(comment)
        .where(
            and(
                userId ? eq(comment.userId, userId) : undefined,
                status ? eq(comment.status, status) : undefined,
                visibility ? eq(comment.visibility, visibility) : undefined
            )
        );

    return result?.count || 0;
}

export async function updateComment(
    id: string,
    updateComment: UpdateComment
): Promise<Comment> {
    const [result] = await db()
        .update(comment)
        .set(updateComment)
        .where(eq(comment.id, id))
        .returning();

    return result;
}

export async function deleteComment(id: string): Promise<void> {
    await db().delete(comment).where(eq(comment.id, id));
}

export async function incrementCommentLikes(id: string): Promise<void> {
    await db()
        .update(comment)
        .set({ likes: count() })
        .where(eq(comment.id, id));
}

export async function incrementCommentReplies(id: string): Promise<void> {
    const current = await findCommentById(id);
    if (current) {
        await db()
            .update(comment)
            .set({ replies: (current.replies || 0) + 1 })
            .where(eq(comment.id, id));
    }
}

// Comment Reply CRUD operations
export async function createCommentReply(
    newReply: NewCommentReply
): Promise<CommentReply> {
    const [result] = await db()
        .insert(commentReply)
        .values(newReply)
        .returning();

    // Increment reply count on parent comment
    await incrementCommentReplies(newReply.commentId);

    return result;
}

export async function findCommentReplyById(
    id: string
): Promise<CommentReply | null> {
    const [result] = await db()
        .select()
        .from(commentReply)
        .where(eq(commentReply.id, id));
    return result || null;
}

export async function getCommentReplies({
    commentId,
    parentReplyId,
    status,
    page = 1,
    limit = 10,
    getUser = false,
}: {
    commentId: string;
    parentReplyId?: string;
    status?: string;
    page?: number;
    limit?: number;
    getUser?: boolean;
}): Promise<CommentReply[]> {
    const result = await db()
        .select()
        .from(commentReply)
        .where(
            and(
                eq(commentReply.commentId, commentId),
                parentReplyId
                    ? eq(commentReply.parentReplyId, parentReplyId)
                    : undefined,
                status ? eq(commentReply.status, status) : undefined
            )
        )
        .orderBy(desc(commentReply.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

    if (getUser) {
        return appendUserToResult(result);
    }

    return result;
}

export async function getCommentRepliesCount({
    commentId,
    parentReplyId,
    status,
}: {
    commentId: string;
    parentReplyId?: string;
    status?: string;
}): Promise<number> {
    const [result] = await db()
        .select({ count: count() })
        .from(commentReply)
        .where(
            and(
                eq(commentReply.commentId, commentId),
                parentReplyId
                    ? eq(commentReply.parentReplyId, parentReplyId)
                    : undefined,
                status ? eq(commentReply.status, status) : undefined
            )
        );

    return result?.count || 0;
}

export async function updateCommentReply(
    id: string,
    updateReply: UpdateCommentReply
): Promise<CommentReply> {
    const [result] = await db()
        .update(commentReply)
        .set(updateReply)
        .where(eq(commentReply.id, id))
        .returning();

    return result;
}

export async function deleteCommentReply(id: string): Promise<void> {
    await db().delete(commentReply).where(eq(commentReply.id, id));
}

// Comment Like operations
export async function createCommentLike(
    newLike: NewCommentLike
): Promise<CommentLike> {
    const [result] = await db().insert(commentLike).values(newLike).returning();
    return result;
}

export async function findCommentLike({
    commentId,
    replyId,
    userId,
}: {
    commentId?: string;
    replyId?: string;
    userId: string;
}): Promise<CommentLike | null> {
    const [result] = await db()
        .select()
        .from(commentLike)
        .where(
            and(
                commentId ? eq(commentLike.commentId, commentId) : undefined,
                replyId ? eq(commentLike.replyId, replyId) : undefined,
                eq(commentLike.userId, userId)
            )
        );
    return result || null;
}

export async function deleteCommentLike(id: string): Promise<void> {
    await db().delete(commentLike).where(eq(commentLike.id, id));
}

export async function isCommentLikedByUser({
    commentId,
    userId,
}: {
    commentId: string;
    userId: string;
}): Promise<boolean> {
    const like = await findCommentLike({ commentId, userId });
    return !!like;
}

export async function isReplyLikedByUser({
    replyId,
    userId,
}: {
    replyId: string;
    userId: string;
}): Promise<boolean> {
    const like = await findCommentLike({ replyId, userId });
    return !!like;
}
