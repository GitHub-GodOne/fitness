import { and, count, desc, eq, inArray, ne } from 'drizzle-orm';

import { db } from '@/core/db';
import { showcaseVideo } from '@/config/db/schema';
import { parseShowcaseVideoIdFromWatchSlug } from '@/shared/lib/showcase-video-url';
import { appendUserToResult } from '@/shared/models/user';

export type ShowcaseVideo = typeof showcaseVideo.$inferSelect & {
  user?: any;
};
export type NewShowcaseVideo = typeof showcaseVideo.$inferInsert;
export type UpdateShowcaseVideo = Partial<
  Omit<NewShowcaseVideo, 'id' | 'createdAt'>
>;

export enum ShowcaseVideoStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export async function addShowcaseVideo(data: NewShowcaseVideo) {
  const [result] = await db().insert(showcaseVideo).values(data).returning();
  return result;
}

export async function updateShowcaseVideo(id: string, data: UpdateShowcaseVideo) {
  const [result] = await db()
    .update(showcaseVideo)
    .set(data)
    .where(eq(showcaseVideo.id, id))
    .returning();

  return result;
}

export async function findShowcaseVideoById(id: string) {
  const [result] = await db()
    .select()
    .from(showcaseVideo)
    .where(eq(showcaseVideo.id, id))
    .limit(1);

  return result;
}

export async function findPublishedShowcaseVideoByWatchSlug(watchSlug: string) {
  const id = parseShowcaseVideoIdFromWatchSlug(watchSlug);
  if (!id) {
    return null;
  }

  const [result] = await db()
    .select()
    .from(showcaseVideo)
    .where(
      and(
        eq(showcaseVideo.id, id),
        eq(showcaseVideo.status, ShowcaseVideoStatus.PUBLISHED)
      )
    )
    .limit(1);

  return result ?? null;
}

export async function findShowcaseVideoBySourceTaskId(params: {
  userId: string;
  sourceTaskId: string;
}) {
  const [result] = await db()
    .select()
    .from(showcaseVideo)
    .where(
      and(
        eq(showcaseVideo.userId, params.userId),
        eq(showcaseVideo.sourceTaskId, params.sourceTaskId)
      )
    )
    .limit(1);

  return result;
}

export async function getShowcaseVideos({
  ids,
  userId,
  categoryId,
  status,
  excludeId,
  page = 1,
  limit = 24,
  getUser = false,
}: {
  ids?: string[];
  userId?: string;
  categoryId?: string;
  status?: ShowcaseVideoStatus | string;
  excludeId?: string;
  page?: number;
  limit?: number;
  getUser?: boolean;
}) {
  const result = await db()
    .select()
    .from(showcaseVideo)
    .where(
      and(
        ids ? inArray(showcaseVideo.id, ids) : undefined,
        userId ? eq(showcaseVideo.userId, userId) : undefined,
        categoryId ? eq(showcaseVideo.categoryId, categoryId) : undefined,
        status ? eq(showcaseVideo.status, status) : undefined,
        excludeId ? ne(showcaseVideo.id, excludeId) : undefined
      )
    )
    .orderBy(desc(showcaseVideo.featured), desc(showcaseVideo.sort), desc(showcaseVideo.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

export async function getShowcaseVideosCount({
  userId,
  categoryId,
  status,
}: {
  userId?: string;
  categoryId?: string;
  status?: ShowcaseVideoStatus | string;
} = {}) {
  const [result] = await db()
    .select({ count: count() })
    .from(showcaseVideo)
    .where(
      and(
        userId ? eq(showcaseVideo.userId, userId) : undefined,
        categoryId ? eq(showcaseVideo.categoryId, categoryId) : undefined,
        status ? eq(showcaseVideo.status, status) : undefined
      )
    );

  return result?.count || 0;
}
