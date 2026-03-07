import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
    createFitnessVideo,
    createFitnessVideoGroup,
    listFitnessVideoGroups,
    updateFitnessVideo,
    updateFitnessVideoGroup,
    deleteFitnessVideo,
    deleteFitnessVideoGroup,
    getVideoMappings,
    createObjectVideoMapping,
    deleteObjectVideoMappingsByVideoId,
    listFitnessVideosByGroup,
} from '@/shared/models/video_library';

/**
 * Get all fitness video groups (admin only)
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const canView = await hasPermission(user.id, 'admin.video-library.read');
        if (!canView) {
            return respErr('no permission', 403);
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || undefined;
        const difficulty = searchParams.get('difficulty') || undefined;
        const search = searchParams.get('search') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        const videoGroups = await listFitnessVideoGroups({
            status,
            difficulty,
            search,
            page,
            limit,
        });

        // Fetch videos for each group
        const videoGroupsWithVideos = await Promise.all(
            videoGroups.map(async (group) => {
                const videos = await listFitnessVideosByGroup(group.id);
                return {
                    ...group,
                    videos,
                };
            })
        );

        return respData({ videoGroups: videoGroupsWithVideos, page, limit });
    } catch (e: any) {
        console.error('[Admin Video Library Videos] GET failed:', e);
        return respErr(e.message || 'Failed to get video groups', 500);
    }
}

/**
 * Create a new fitness video group with videos and mappings (admin only)
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const canWrite = await hasPermission(user.id, 'admin.video-library.write');
        if (!canWrite) {
            return respErr('no permission', 403);
        }

        const body = await req.json();
        const {
            title,
            titleZh,
            description,
            descriptionZh,
            thumbnailUrl,
            difficulty,
            gender,
            accessType,
            ageGroup,
            instructions,
            instructionsZh,
            tags,
            status,
            sort,
            videos, // Array of { viewAngle, viewAngleZh, videoUrl, duration, sort }
            mappings, // Array of { objectId, bodyPartId, isPrimary }
        } = body;

        if (!title) {
            return respErr('title is required');
        }

        // Create video group
        const newGroup = await createFitnessVideoGroup({
            title,
            titleZh,
            description,
            descriptionZh,
            thumbnailUrl,
            difficulty,
            gender,
            accessType,
            ageGroup,
            instructions,
            instructionsZh,
            tags,
            status,
            sort,
        });

        // Create videos for this group
        if (videos && Array.isArray(videos)) {
            for (const video of videos) {
                await createFitnessVideo({
                    groupId: newGroup.id,
                    viewAngle: video.viewAngle,
                    viewAngleZh: video.viewAngleZh,
                    videoUrl: video.videoUrl,
                    duration: video.duration,
                    sort: video.sort,
                });
            }
        }

        // Create mappings if provided
        if (mappings && Array.isArray(mappings)) {
            for (const mapping of mappings) {
                await createObjectVideoMapping({
                    objectId: mapping.objectId,
                    videoGroupId: newGroup.id,
                    bodyPartId: mapping.bodyPartId,
                    isPrimary: mapping.isPrimary,
                });
            }
        }

        // Get full group with videos and mappings
        const groupVideos = await listFitnessVideosByGroup(newGroup.id);
        const videoMappings = await getVideoMappings(newGroup.id);

        return respData({ videoGroup: newGroup, videos: groupVideos, mappings: videoMappings });
    } catch (e: any) {
        console.error('[Admin Video Library Videos] POST failed:', e);
        return respErr(e.message || 'Failed to create video group', 500);
    }
}

/**
 * Update a fitness video group with videos and mappings (admin only)
 */
export async function PUT(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const canWrite = await hasPermission(user.id, 'admin.video-library.write');
        if (!canWrite) {
            return respErr('no permission', 403);
        }

        const body = await req.json();
        const {
            id,
            title,
            titleZh,
            description,
            descriptionZh,
            thumbnailUrl,
            difficulty,
            gender,
            accessType,
            ageGroup,
            instructions,
            instructionsZh,
            tags,
            status,
            sort,
            videos, // Array of { id?, viewAngle, viewAngleZh, videoUrl, duration, sort }
            mappings, // Array of { objectId, bodyPartId, isPrimary }
        } = body;

        if (!id) {
            return respErr('id is required');
        }

        // Update video group
        const updatedGroup = await updateFitnessVideoGroup(id, {
            title,
            titleZh,
            description,
            descriptionZh,
            thumbnailUrl,
            difficulty,
            gender,
            accessType,
            ageGroup,
            instructions,
            instructionsZh,
            tags,
            status,
            sort,
        });

        // Update videos if provided (simplified: delete all and recreate)
        if (videos && Array.isArray(videos)) {
            const existingVideos = await listFitnessVideosByGroup(id);
            for (const video of existingVideos) {
                await deleteFitnessVideo(video.id);
            }

            for (const video of videos) {
                await createFitnessVideo({
                    groupId: id,
                    viewAngle: video.viewAngle,
                    viewAngleZh: video.viewAngleZh,
                    videoUrl: video.videoUrl,
                    duration: video.duration,
                    sort: video.sort,
                });
            }
        }

        // Update mappings if provided
        if (mappings && Array.isArray(mappings)) {
            // Delete existing mappings
            await deleteObjectVideoMappingsByVideoId(id);

            // Create new mappings
            for (const mapping of mappings) {
                await createObjectVideoMapping({
                    objectId: mapping.objectId,
                    videoGroupId: id,
                    bodyPartId: mapping.bodyPartId,
                    isPrimary: mapping.isPrimary,
                });
            }
        }

        // Get full group with videos and mappings
        const groupVideos = await listFitnessVideosByGroup(id);
        const videoMappings = await getVideoMappings(id);

        return respData({ videoGroup: updatedGroup, videos: groupVideos, mappings: videoMappings });
    } catch (e: any) {
        console.error('[Admin Video Library Videos] PUT failed:', e);
        return respErr(e.message || 'Failed to update video group', 500);
    }
}

/**
 * Delete a fitness video group (admin only)
 */
export async function DELETE(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const canDelete = await hasPermission(user.id, 'admin.video-library.delete');
        if (!canDelete) {
            return respErr('no permission', 403);
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return respErr('id is required');
        }

        // Delete mappings first
        await deleteObjectVideoMappingsByVideoId(id);

        // Delete video group (cascade will delete videos)
        await deleteFitnessVideoGroup(id);

        return respData({ success: true });
    } catch (e: any) {
        console.error('[Admin Video Library Videos] DELETE failed:', e);
        return respErr(e.message || 'Failed to delete video group', 500);
    }
}
