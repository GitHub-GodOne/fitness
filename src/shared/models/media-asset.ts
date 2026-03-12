import { and, count, desc, eq } from 'drizzle-orm';

import { mediaAsset } from '@/config/db/schema';
import { db } from '@/core/db';
import { replaceR2Url } from '@/shared/lib/url';

export type MediaAsset = typeof mediaAsset.$inferSelect;
export type NewMediaAsset = typeof mediaAsset.$inferInsert;

export enum MediaAssetType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export async function addMediaAsset(data: NewMediaAsset) {
  const normalizedData: NewMediaAsset = {
    ...data,
    url: replaceR2Url(data.url),
  };

  const [result] = await db()
    .insert(mediaAsset)
    .values(normalizedData)
    .onConflictDoUpdate({
      target: mediaAsset.key,
      set: {
        userId: normalizedData.userId,
        provider: normalizedData.provider,
        mediaType: normalizedData.mediaType,
        name: normalizedData.name,
        url: normalizedData.url,
        contentType: normalizedData.contentType,
        size: normalizedData.size,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!result) {
    return result;
  }

  return {
    ...result,
    url: replaceR2Url(result.url),
  };
}

export async function getMediaAssets({
  mediaType,
  page = 1,
  limit = 60,
}: {
  mediaType?: MediaAssetType | string;
  page?: number;
  limit?: number;
} = {}) {
  const result = await db()
    .select()
    .from(mediaAsset)
    .where(and(mediaType ? eq(mediaAsset.mediaType, mediaType) : undefined))
    .orderBy(desc(mediaAsset.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result.map((item) => ({
    ...item,
    url: replaceR2Url(item.url),
  }));
}

export async function getMediaAssetsCount({
  mediaType,
}: {
  mediaType?: MediaAssetType | string;
} = {}) {
  const [result] = await db()
    .select({ count: count() })
    .from(mediaAsset)
    .where(and(mediaType ? eq(mediaAsset.mediaType, mediaType) : undefined));

  return result?.count || 0;
}

export async function getMediaAssetById(id: string) {
  const [result] = await db()
    .select()
    .from(mediaAsset)
    .where(eq(mediaAsset.id, id))
    .limit(1);

  if (!result) {
    return null;
  }

  return {
    ...result,
    url: replaceR2Url(result.url),
  };
}

export async function deleteMediaAssetById(id: string) {
  const [result] = await db()
    .delete(mediaAsset)
    .where(eq(mediaAsset.id, id))
    .returning();

  if (!result) {
    return null;
  }

  return {
    ...result,
    url: replaceR2Url(result.url),
  };
}

export async function deleteMediaAssetByKey(key: string) {
  const [result] = await db()
    .delete(mediaAsset)
    .where(eq(mediaAsset.key, key))
    .returning();

  if (!result) {
    return null;
  }

  return {
    ...result,
    url: replaceR2Url(result.url),
  };
}
