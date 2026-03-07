/**
 * Video Library Model - CRUD operations for fitness video library
 */
import { eq, and, like, desc, asc, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import {
  fitnessObject,
  bodyPart,
  fitnessVideo,
  fitnessVideoGroup,
  objectVideoMapping,
} from '@/config/db/schema';

// ============================================
// Fitness Object (物品) CRUD
// ============================================

export interface CreateFitnessObject {
  name: string;
  nameZh?: string;
  aliases?: string[];
  category: string;
  description?: string;
  image?: string;
  status?: string;
  priority?: number;
}

export interface UpdateFitnessObject {
  name?: string;
  nameZh?: string;
  aliases?: string[];
  category?: string;
  description?: string;
  image?: string;
  status?: string;
  priority?: number;
}

export async function createFitnessObject(data: CreateFitnessObject) {
  const id = nanoid();
  const result = await db()
    .insert(fitnessObject)
    .values({
      id,
      name: data.name,
      nameZh: data.nameZh,
      aliases: data.aliases ? JSON.stringify(data.aliases) : null,
      category: data.category,
      description: data.description,
      image: data.image,
      status: data.status || 'active',
      priority: data.priority ?? 0,
    })
    .returning();
  return result[0];
}

export async function updateFitnessObject(id: string, data: UpdateFitnessObject) {
  const result = await db()
    .update(fitnessObject)
    .set({
      ...data,
      aliases: data.aliases ? JSON.stringify(data.aliases) : undefined,
    })
    .where(eq(fitnessObject.id, id))
    .returning();
  return result[0];
}

export async function deleteFitnessObject(id: string) {
  await db().delete(fitnessObject).where(eq(fitnessObject.id, id));
}

export async function getFitnessObjectById(id: string) {
  const result = await db()
    .select()
    .from(fitnessObject)
    .where(eq(fitnessObject.id, id))
    .limit(1);
  return result[0];
}

export async function listFitnessObjects(options?: {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  let query = db().select().from(fitnessObject);

  const conditions = [];
  if (options?.status) {
    conditions.push(eq(fitnessObject.status, options.status));
  }
  if (options?.category) {
    conditions.push(eq(fitnessObject.category, options.category));
  }
  if (options?.search) {
    conditions.push(like(fitnessObject.name, `%${options.search}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query.orderBy(desc(fitnessObject.priority), asc(fitnessObject.name)).limit(limit).offset(offset);
  return result;
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a score between 0 and 1, where 1 means identical
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return shorter / longer;
  }

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

/**
 * Common object synonyms mapping
 */
const OBJECT_SYNONYMS: Record<string, string[]> = {
  'chair': ['seat', 'stool', 'bench', 'sofa', 'couch', 'armchair'],
  'sofa': ['couch', 'settee', 'loveseat', 'chair'],
  'couch': ['sofa', 'settee', 'loveseat'],
  'bench': ['seat', 'stool', 'chair'],
  'stool': ['seat', 'bench', 'chair'],
  'table': ['desk', 'counter', 'worktop'],
  'desk': ['table', 'workstation'],
  'bottle': ['container', 'flask', 'jug'],
  'water bottle': ['bottle', 'drink bottle', 'hydration bottle'],
  'dumbbell': ['weight', 'free weight', 'hand weight'],
  'barbell': ['weight bar', 'lifting bar'],
  'kettlebell': ['kettle weight', 'weight'],
  'mat': ['yoga mat', 'exercise mat', 'fitness mat', 'pad'],
  'yoga mat': ['mat', 'exercise mat', 'fitness mat'],
  'ball': ['exercise ball', 'fitness ball', 'gym ball', 'swiss ball', 'medicine ball'],
  'exercise ball': ['ball', 'fitness ball', 'gym ball', 'swiss ball'],
  'resistance band': ['band', 'exercise band', 'stretch band', 'elastic band'],
  'band': ['resistance band', 'exercise band', 'stretch band'],
  'towel': ['cloth', 'napkin'],
  'wall': ['vertical surface'],
  'floor': ['ground', 'surface'],
  'door': ['doorway', 'entrance'],
  'window': ['glass', 'opening'],
};

/**
 * Expand object names with synonyms
 */
function expandWithSynonyms(names: string[]): string[] {
  const expanded = new Set(names);

  for (const name of names) {
    const lowerName = name.toLowerCase().trim();

    // Direct synonyms
    if (OBJECT_SYNONYMS[lowerName]) {
      OBJECT_SYNONYMS[lowerName].forEach(s => expanded.add(s));
    }

    // Reverse lookup - find if this name is a synonym of something else
    for (const [key, synonyms] of Object.entries(OBJECT_SYNONYMS)) {
      if (synonyms.includes(lowerName)) {
        expanded.add(key);
        synonyms.forEach(s => expanded.add(s));
      }
    }
  }

  return Array.from(expanded);
}

export async function findObjectsByNames(names: string[]) {
  if (names.length === 0) return [];

  // Expand names with synonyms
  const expandedNames = expandWithSynonyms(names);

  // Search by name with exact match first (using inArray for safety)
  const result = await db()
    .select()
    .from(fitnessObject)
    .where(
      and(
        eq(fitnessObject.status, 'active'),
        inArray(fitnessObject.name, expandedNames),
      )
    );

  // If no exact matches, try fuzzy matching
  if (result.length === 0) {
    // Get all active objects
    const allObjects = await db()
      .select()
      .from(fitnessObject)
      .where(eq(fitnessObject.status, 'active'));

    const fuzzyMatches: (typeof fitnessObject.$inferSelect & { similarity: number })[] = [];

    for (const obj of allObjects) {
      let maxSimilarity = 0;

      // Check against all expanded names
      for (const name of expandedNames) {
        // Check name similarity
        const nameSim = calculateSimilarity(obj.name, name);
        maxSimilarity = Math.max(maxSimilarity, nameSim);

        // Check aliases similarity
        if (obj.aliases) {
          try {
            const aliases = JSON.parse(obj.aliases as string) as string[];
            for (const alias of aliases) {
              const aliasSim = calculateSimilarity(alias, name);
              maxSimilarity = Math.max(maxSimilarity, aliasSim);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Threshold for fuzzy match (0.6 = 60% similar)
      if (maxSimilarity >= 0.6) {
        fuzzyMatches.push({ ...obj, similarity: maxSimilarity });
      }
    }

    // Sort by similarity and return top matches
    fuzzyMatches.sort((a, b) => b.similarity - a.similarity);
    return fuzzyMatches.slice(0, 5); // Return up to 5 fuzzy matches
  }

  return result;
}

// ============================================
// Body Part (身体部位) CRUD
// ============================================

export interface CreateBodyPart {
  name: string;
  nameZh?: string;
  icon?: string;
  description?: string;
  status?: string;
  sort?: number;
}

export interface UpdateBodyPart {
  name?: string;
  nameZh?: string;
  icon?: string;
  description?: string;
  status?: string;
  sort?: number;
}

export async function createBodyPart(data: CreateBodyPart) {
  const id = nanoid();
  const result = await db()
    .insert(bodyPart)
    .values({
      id,
      name: data.name,
      nameZh: data.nameZh,
      icon: data.icon,
      description: data.description,
      status: data.status || 'active',
      sort: data.sort || 0,
    })
    .returning();
  return result[0];
}

export async function updateBodyPart(id: string, data: UpdateBodyPart) {
  const result = await db()
    .update(bodyPart)
    .set(data)
    .where(eq(bodyPart.id, id))
    .returning();
  return result[0];
}

export async function deleteBodyPart(id: string) {
  await db().delete(bodyPart).where(eq(bodyPart.id, id));
}

export async function getBodyPartById(id: string) {
  const result = await db()
    .select()
    .from(bodyPart)
    .where(eq(bodyPart.id, id))
    .limit(1);
  return result[0];
}

export async function getBodyPartByName(name: string) {
  // Try exact match first
  const exact = await db()
    .select()
    .from(bodyPart)
    .where(eq(bodyPart.name, name))
    .limit(1);
  if (exact[0]) return exact[0];

  // Try case-insensitive match
  const ciMatch = await db()
    .select()
    .from(bodyPart)
    .where(sql`LOWER(${bodyPart.name}) = LOWER(${name})`)
    .limit(1);
  if (ciMatch[0]) return ciMatch[0];

  // Try partial match (e.g. "waist" matches "Core/Waist")
  const partialMatch = await db()
    .select()
    .from(bodyPart)
    .where(sql`LOWER(${bodyPart.name}) LIKE ${'%' + name.toLowerCase() + '%'}`)
    .limit(1);
  return partialMatch[0];
}

export async function listBodyParts(options?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  let query = db().select().from(bodyPart);

  if (options?.status) {
    query = query.where(eq(bodyPart.status, options.status)) as typeof query;
  }

  const result = await query.orderBy(asc(bodyPart.sort), asc(bodyPart.name)).limit(limit).offset(offset);
  return result;
}

// ============================================
// Fitness Video Group (健身视频组) CRUD
// ============================================

export interface CreateFitnessVideoGroup {
  title: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  thumbnailUrl?: string;
  difficulty?: string;
  gender?: string;
  accessType?: string;
  ageGroup?: string;
  instructions?: string;
  instructionsZh?: string;
  tags?: string[];
  status?: string;
  sort?: number;
}

export interface UpdateFitnessVideoGroup {
  title?: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  thumbnailUrl?: string;
  difficulty?: string;
  gender?: string;
  accessType?: string;
  ageGroup?: string;
  instructions?: string;
  instructionsZh?: string;
  tags?: string[];
  status?: string;
  sort?: number;
}

export async function createFitnessVideoGroup(data: CreateFitnessVideoGroup) {
  const id = nanoid();
  const result = await db()
    .insert(fitnessVideoGroup)
    .values({
      id,
      title: data.title,
      titleZh: data.titleZh,
      description: data.description,
      descriptionZh: data.descriptionZh,
      thumbnailUrl: data.thumbnailUrl,
      difficulty: data.difficulty || 'beginner',
      gender: data.gender || 'unisex',
      accessType: data.accessType || 'free',
      ageGroup: data.ageGroup || 'all',
      instructions: data.instructions,
      instructionsZh: data.instructionsZh,
      tags: data.tags ? JSON.stringify(data.tags) : null,
      status: data.status || 'active',
      sort: data.sort || 0,
    })
    .returning();
  return result[0];
}

export async function updateFitnessVideoGroup(id: string, data: UpdateFitnessVideoGroup) {
  const result = await db()
    .update(fitnessVideoGroup)
    .set({
      ...data,
      tags: data.tags ? JSON.stringify(data.tags) : undefined,
    })
    .where(eq(fitnessVideoGroup.id, id))
    .returning();
  return result[0];
}

export async function deleteFitnessVideoGroup(id: string) {
  // Soft delete
  await db()
    .update(fitnessVideoGroup)
    .set({ deletedAt: new Date(), status: 'deleted' })
    .where(eq(fitnessVideoGroup.id, id));
}

export async function getFitnessVideoGroupById(id: string) {
  const result = await db()
    .select()
    .from(fitnessVideoGroup)
    .where(eq(fitnessVideoGroup.id, id))
    .limit(1);
  return result[0];
}

export async function listFitnessVideoGroups(options?: {
  status?: string;
  difficulty?: string;
  gender?: string;
  accessType?: string;
  ageGroup?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  let query = db().select().from(fitnessVideoGroup);

  const conditions = [];
  if (options?.status) {
    conditions.push(eq(fitnessVideoGroup.status, options.status));
  }
  if (options?.difficulty) {
    conditions.push(eq(fitnessVideoGroup.difficulty, options.difficulty));
  }
  if (options?.gender) {
    conditions.push(
      sql`(${fitnessVideoGroup.gender} = ${options.gender} OR ${fitnessVideoGroup.gender} = 'unisex')`
    );
  }
  if (options?.accessType) {
    if (options.accessType === 'premium') {
      // Premium users can see both free and premium content
      conditions.push(sql`${fitnessVideoGroup.accessType} IN ('free', 'premium')`);
    } else {
      // Free users can only see free content
      conditions.push(eq(fitnessVideoGroup.accessType, 'free'));
    }
  } else {
    // Exclude hidden by default
    conditions.push(sql`${fitnessVideoGroup.accessType} != 'hidden'`);
  }
  if (options?.ageGroup) {
    conditions.push(
      sql`(${fitnessVideoGroup.ageGroup} = ${options.ageGroup} OR ${fitnessVideoGroup.ageGroup} = 'all')`
    );
  }
  if (options?.search) {
    conditions.push(like(fitnessVideoGroup.title, `%${options.search}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query
    .orderBy(asc(fitnessVideoGroup.sort), desc(fitnessVideoGroup.createdAt))
    .limit(limit)
    .offset(offset);
  return result;
}

export async function incrementVideoGroupViewCount(id: string) {
  await db()
    .update(fitnessVideoGroup)
    .set({ viewCount: sql`${fitnessVideoGroup.viewCount} + 1` })
    .where(eq(fitnessVideoGroup.id, id));
}

// ============================================
// Fitness Video (健身视频) CRUD
// ============================================

export interface CreateFitnessVideo {
  groupId: string;
  viewAngle: string;
  viewAngleZh?: string;
  videoUrl: string;
  duration?: number;
  status?: string;
  sort?: number;
}

export interface UpdateFitnessVideo {
  viewAngle?: string;
  viewAngleZh?: string;
  videoUrl?: string;
  duration?: number;
  status?: string;
  sort?: number;
}

export async function createFitnessVideo(data: CreateFitnessVideo) {
  const id = nanoid();
  const result = await db()
    .insert(fitnessVideo)
    .values({
      id,
      groupId: data.groupId,
      viewAngle: data.viewAngle,
      viewAngleZh: data.viewAngleZh,
      videoUrl: data.videoUrl,
      duration: data.duration,
      status: data.status || 'active',
      sort: data.sort || 0,
    })
    .returning();
  return result[0];
}

export async function updateFitnessVideo(id: string, data: UpdateFitnessVideo) {
  const result = await db()
    .update(fitnessVideo)
    .set(data)
    .where(eq(fitnessVideo.id, id))
    .returning();
  return result[0];
}

export async function deleteFitnessVideo(id: string) {
  // Hard delete since videos are part of a group
  await db()
    .delete(fitnessVideo)
    .where(eq(fitnessVideo.id, id));
}

export async function getFitnessVideoById(id: string) {
  const result = await db()
    .select()
    .from(fitnessVideo)
    .where(eq(fitnessVideo.id, id))
    .limit(1);
  return result[0];
}

export async function listFitnessVideosByGroup(groupId: string) {
  const result = await db()
    .select()
    .from(fitnessVideo)
    .where(and(
      eq(fitnessVideo.groupId, groupId),
      eq(fitnessVideo.status, 'active')
    ))
    .orderBy(asc(fitnessVideo.sort));
  return result;
}

// ============================================
// Object-Video Mapping (物品-视频关联) CRUD
// ============================================

export interface CreateObjectVideoMapping {
  objectId: string;
  videoGroupId: string;
  bodyPartId: string;
  isPrimary?: boolean;
}

export async function createObjectVideoMapping(data: CreateObjectVideoMapping) {
  const id = nanoid();
  const result = await db()
    .insert(objectVideoMapping)
    .values({
      id,
      objectId: data.objectId,
      videoGroupId: data.videoGroupId,
      bodyPartId: data.bodyPartId,
      isPrimary: data.isPrimary || false,
    })
    .returning();
  return result[0];
}

export async function deleteObjectVideoMapping(id: string) {
  await db().delete(objectVideoMapping).where(eq(objectVideoMapping.id, id));
}

export async function deleteObjectVideoMappingsByVideoId(videoGroupId: string) {
  await db().delete(objectVideoMapping).where(eq(objectVideoMapping.videoGroupId, videoGroupId));
}

export async function getVideoMappings(videoGroupId: string) {
  const result = await db()
    .select({
      mapping: objectVideoMapping,
      object: fitnessObject,
      bodyPart: bodyPart,
    })
    .from(objectVideoMapping)
    .leftJoin(fitnessObject, eq(objectVideoMapping.objectId, fitnessObject.id))
    .leftJoin(bodyPart, eq(objectVideoMapping.bodyPartId, bodyPart.id))
    .where(eq(objectVideoMapping.videoGroupId, videoGroupId));
  return result;
}

/**
 * Find videos matching an object + multiple body parts, prioritizing videos that cover the most body parts.
 *
 * Strategy:
 * 1. Find all videos for this object across ALL requested body parts
 * 2. Count how many of the requested body parts each video covers
 * 3. Sort by match count desc (videos covering more body parts first)
 * 4. If no multi-match videos, individual body part matches are still returned
 */
export async function findVideosByObjectAndBodyParts(
  objectName: string,
  bodyPartNames: string[],
  options?: {
    limit?: number;
    difficulty?: string;
    gender?: string;
    accessType?: string;
    ageGroup?: string;
  }
) {
  if (!objectName || bodyPartNames.length === 0) return [];

  const limit = options?.limit || 10;

  // Find the object
  const objects = await findObjectsByNames([objectName]);
  if (objects.length === 0) return [];
  const objectIds = objects.map((o: typeof fitnessObject.$inferSelect) => o.id);

  // Resolve all body part IDs
  const bpIds: string[] = [];
  for (const name of bodyPartNames) {
    const bp = await getBodyPartByName(name);
    if (bp) bpIds.push(bp.id);
  }
  if (bpIds.length === 0) return [];

  // Build video group filter conditions
  const conditions = [
    inArray(objectVideoMapping.objectId, objectIds),
    inArray(objectVideoMapping.bodyPartId, bpIds),
    eq(fitnessVideoGroup.status, 'active'),
  ];
  if (options?.difficulty) {
    conditions.push(eq(fitnessVideoGroup.difficulty, options.difficulty));
  }
  if (options?.gender) {
    conditions.push(
      sql`(${fitnessVideoGroup.gender} = ${options.gender} OR ${fitnessVideoGroup.gender} = 'unisex')`
    );
  }
  if (options?.accessType) {
    if (options.accessType === 'premium') {
      // Premium users can see both free and premium content
      conditions.push(sql`${fitnessVideoGroup.accessType} IN ('free', 'premium')`);
    } else {
      // Free users can only see free content
      conditions.push(eq(fitnessVideoGroup.accessType, 'free'));
    }
  } else {
    conditions.push(sql`${fitnessVideoGroup.accessType} != 'hidden'`);
  }
  if (options?.ageGroup) {
    conditions.push(
      sql`(${fitnessVideoGroup.ageGroup} = ${options.ageGroup} OR ${fitnessVideoGroup.ageGroup} = 'all')`
    );
  }

  // Query all mappings for this object across all requested body parts
  const rows = await db()
    .select({
      videoGroup: fitnessVideoGroup,
      mapping: objectVideoMapping,
      object: fitnessObject,
    })
    .from(objectVideoMapping)
    .innerJoin(fitnessVideoGroup, eq(objectVideoMapping.videoGroupId, fitnessVideoGroup.id))
    .innerJoin(fitnessObject, eq(objectVideoMapping.objectId, fitnessObject.id))
    .where(and(...conditions))
    .orderBy(desc(objectVideoMapping.isPrimary), asc(fitnessVideoGroup.sort));

  // Group by video group and count how many requested body parts each group covers
  const groupMap = new Map<string, { videoGroup: typeof fitnessVideoGroup.$inferSelect; object: typeof fitnessObject.$inferSelect; matchedBpCount: number; matchedBpIds: Set<string> }>();

  for (const row of rows) {
    const gid = row.videoGroup.id;
    if (!groupMap.has(gid)) {
      groupMap.set(gid, {
        videoGroup: row.videoGroup,
        object: row.object,
        matchedBpCount: 0,
        matchedBpIds: new Set(),
      });
    }
    const entry = groupMap.get(gid)!;
    const bpId = row.mapping.bodyPartId;
    if (!entry.matchedBpIds.has(bpId)) {
      entry.matchedBpIds.add(bpId);
      entry.matchedBpCount++;
    }
  }

  // Sort: most body parts matched first, then by sort order
  const sorted = Array.from(groupMap.values())
    .sort((a, b) => b.matchedBpCount - a.matchedBpCount);

  // Get all videos for each video group
  const result = [];
  for (const entry of sorted.slice(0, limit)) {
    const videos = await db()
      .select()
      .from(fitnessVideo)
      .where(and(
        eq(fitnessVideo.groupId, entry.videoGroup.id),
        eq(fitnessVideo.status, 'active')
      ))
      .orderBy(asc(fitnessVideo.sort));

    result.push({
      videoGroup: entry.videoGroup,
      videos: videos,
      object: entry.object,
      matchedBpCount: entry.matchedBpCount,
    });
  }

  return result;
}

/**
 * Get all video groups for a specific body part
 */
export async function getVideosByBodyPart(
  bodyPartName: string,
  options?: {
    limit?: number;
    difficulty?: string;
    gender?: string;
    accessType?: string;
    ageGroup?: string;
  }
) {
  const limit = options?.limit || 20;

  const bp = await getBodyPartByName(bodyPartName);

  // Helper to build common video group filter conditions
  const buildVideoGroupConditions = () => {
    const conds = [eq(fitnessVideoGroup.status, 'active')];
    if (options?.difficulty) {
      conds.push(eq(fitnessVideoGroup.difficulty, options.difficulty));
    }
    if (options?.gender) {
      conds.push(
        sql`(${fitnessVideoGroup.gender} = ${options.gender} OR ${fitnessVideoGroup.gender} = 'unisex')`
      );
    }
    if (options?.accessType) {
      if (options.accessType === 'premium') {
        // Premium users can see both free and premium content
        conds.push(sql`${fitnessVideoGroup.accessType} IN ('free', 'premium')`);
      } else {
        // Free users can only see free content
        conds.push(eq(fitnessVideoGroup.accessType, 'free'));
      }
    } else {
      conds.push(sql`${fitnessVideoGroup.accessType} != 'hidden'`);
    }
    if (options?.ageGroup) {
      conds.push(
        sql`(${fitnessVideoGroup.ageGroup} = ${options.ageGroup} OR ${fitnessVideoGroup.ageGroup} = 'all')`
      );
    }
    return conds;
  };

  // Try mapping-based query first if body part exists
  if (bp) {
    const conditions = [
      eq(objectVideoMapping.bodyPartId, bp.id),
      ...buildVideoGroupConditions()
    ];

    const rows = await db()
      .select({
        videoGroup: fitnessVideoGroup,
        mapping: objectVideoMapping,
      })
      .from(objectVideoMapping)
      .innerJoin(fitnessVideoGroup, eq(objectVideoMapping.videoGroupId, fitnessVideoGroup.id))
      .where(and(...conditions))
      .orderBy(asc(fitnessVideoGroup.sort), desc(fitnessVideoGroup.viewCount))
      .limit(limit);

    if (rows.length > 0) {
      const uniqueGroups = new Map();
      for (const r of rows) {
        if (!uniqueGroups.has(r.videoGroup.id)) {
          uniqueGroups.set(r.videoGroup.id, r.videoGroup);
        }
      }

      // Get all videos for each group
      const result = [];
      for (const group of uniqueGroups.values()) {
        const videos = await db()
          .select()
          .from(fitnessVideo)
          .where(and(
            eq(fitnessVideo.groupId, group.id),
            eq(fitnessVideo.status, 'active')
          ))
          .orderBy(asc(fitnessVideo.sort));

        result.push({
          videoGroup: group,
          videos: videos,
        });
      }

      return result;
    }
  }

  // No matching videos for this body part
  console.log(`[VideoLibrary] No mapping results for body part "${bodyPartName}", returning empty`);
  return [];
}
