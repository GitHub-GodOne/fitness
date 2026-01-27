import { and, count, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { videoMerge } from '@/config/db/schema';

export type VideoMerge = typeof videoMerge.$inferSelect;
export type NewVideoMerge = typeof videoMerge.$inferInsert;
export type UpdateVideoMerge = Partial<Omit<NewVideoMerge, 'id' | 'createdAt'>>;

export interface VideoMergeListResponse {
    data: VideoMerge[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

/**
 * Create a new video merge record
 */
export async function createVideoMerge(data: NewVideoMerge): Promise<VideoMerge> {
    const [result] = await db().insert(videoMerge).values(data).returning();
    return result;
}

/**
 * Find video merge by ID
 */
export async function findVideoMergeById(id: string): Promise<VideoMerge | undefined> {
    const [result] = await db()
        .select()
        .from(videoMerge)
        .where(eq(videoMerge.id, id))
        .limit(1);
    return result;
}

/**
 * Get video merges by user ID with pagination
 */
export async function getVideoMergesByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<VideoMergeListResponse> {
    const offset = (page - 1) * limit;

    // Get merge records
    const merges = await db()
        .select()
        .from(videoMerge)
        .where(eq(videoMerge.userId, userId))
        .orderBy(desc(videoMerge.createdAt))
        .limit(limit)
        .offset(offset);

    // Get total count
    const [{ total }] = await db()
        .select({ total: count() })
        .from(videoMerge)
        .where(eq(videoMerge.userId, userId));

    const totalPages = Math.ceil(total / limit);

    return {
        data: merges,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
        },
    };
}

/**
 * Update video merge
 */
export async function updateVideoMerge(
    id: string,
    data: UpdateVideoMerge
): Promise<VideoMerge | undefined> {
    const [result] = await db()
        .update(videoMerge)
        .set(data)
        .where(eq(videoMerge.id, id))
        .returning();
    return result;
}

/**
 * Delete video merge
 */
export async function deleteVideoMerge(id: string): Promise<void> {
    await db().delete(videoMerge).where(eq(videoMerge.id, id));
}

/**
 * Get all video merges by user ID (without pagination)
 */
export async function getAllVideoMergesByUserId(userId: string): Promise<VideoMerge[]> {
    return await db()
        .select()
        .from(videoMerge)
        .where(eq(videoMerge.userId, userId))
        .orderBy(desc(videoMerge.createdAt));
}

/**
 * Get video merges count by user ID
 */
export async function getVideoMergesCountByUserId(userId: string): Promise<number> {
    const [{ total }] = await db()
        .select({ total: count() })
        .from(videoMerge)
        .where(eq(videoMerge.userId, userId));
    return total;
}

/**
 * Get video merges by status
 */
export async function getVideoMergesByStatus(
    status: 'processing' | 'success' | 'failed',
    page: number = 1,
    limit: number = 20
): Promise<VideoMergeListResponse> {
    const offset = (page - 1) * limit;

    const merges = await db()
        .select()
        .from(videoMerge)
        .where(eq(videoMerge.status, status))
        .orderBy(desc(videoMerge.createdAt))
        .limit(limit)
        .offset(offset);

    const [{ total }] = await db()
        .select({ total: count() })
        .from(videoMerge)
        .where(eq(videoMerge.status, status));

    const totalPages = Math.ceil(total / limit);

    return {
        data: merges,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
        },
    };
}

/**
 * Update video merge status
 */
export async function updateVideoMergeStatus(
    id: string,
    status: 'processing' | 'success' | 'failed',
    error?: string
): Promise<VideoMerge | undefined> {
    const updateData: UpdateVideoMerge = { status };
    if (error) {
        updateData.error = error;
    }
    return await updateVideoMerge(id, updateData);
}
