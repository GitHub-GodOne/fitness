import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
    createFitnessVideo,
    listFitnessVideos,
    updateFitnessVideo,
    deleteFitnessVideo,
    getVideoMappings,
    createObjectVideoMapping,
    deleteObjectVideoMappingsByVideoId,
} from '@/shared/models/video_library';

/**
 * Get all fitness videos (admin only)
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

        const videos = await listFitnessVideos({
            status,
            difficulty,
            search,
            page,
            limit,
        });

        return respData({ videos, page, limit });
    } catch (e: any) {
        console.error('[Admin Video Library Videos] GET failed:', e);
        return respErr(e.message || 'Failed to get videos', 500);
    }
}

/**
 * Create a new fitness video with mappings (admin only)
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
            videoUrl,
            thumbnailUrl,
            duration,
            difficulty,
            gender,
            accessType,
            ageGroup,
            instructions,
            instructionsZh,
            tags,
            status,
            sort,
            mappings, // Array of { objectId, bodyPartId, isPrimary }
        } = body;

        if (!title || !videoUrl) {
            return respErr('title and videoUrl are required');
        }

        // Create video
        const newVideo = await createFitnessVideo({
            title,
            titleZh,
            description,
            descriptionZh,
            videoUrl,
            thumbnailUrl,
            duration,
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

        // Create mappings if provided
        if (mappings && Array.isArray(mappings)) {
            for (const mapping of mappings) {
                await createObjectVideoMapping({
                    objectId: mapping.objectId,
                    videoId: newVideo.id,
                    bodyPartId: mapping.bodyPartId,
                    isPrimary: mapping.isPrimary,
                });
            }
        }

        // Get full video with mappings
        const videoMappings = await getVideoMappings(newVideo.id);

        return respData({ video: newVideo, mappings: videoMappings });
    } catch (e: any) {
        console.error('[Admin Video Library Videos] POST failed:', e);
        return respErr(e.message || 'Failed to create video', 500);
    }
}

/**
 * Update a fitness video with mappings (admin only)
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
            videoUrl,
            thumbnailUrl,
            duration,
            difficulty,
            gender,
            accessType,
            ageGroup,
            instructions,
            instructionsZh,
            tags,
            status,
            sort,
            mappings, // Array of { objectId, bodyPartId, isPrimary }
        } = body;

        if (!id) {
            return respErr('id is required');
        }

        // Update video
        const updatedVideo = await updateFitnessVideo(id, {
            title,
            titleZh,
            description,
            descriptionZh,
            videoUrl,
            thumbnailUrl,
            duration,
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

        // Update mappings if provided
        if (mappings && Array.isArray(mappings)) {
            // Delete existing mappings
            await deleteObjectVideoMappingsByVideoId(id);
            
            // Create new mappings
            for (const mapping of mappings) {
                await createObjectVideoMapping({
                    objectId: mapping.objectId,
                    videoId: id,
                    bodyPartId: mapping.bodyPartId,
                    isPrimary: mapping.isPrimary,
                });
            }
        }

        // Get full video with mappings
        const videoMappings = await getVideoMappings(id);

        return respData({ video: updatedVideo, mappings: videoMappings });
    } catch (e: any) {
        console.error('[Admin Video Library Videos] PUT failed:', e);
        return respErr(e.message || 'Failed to update video', 500);
    }
}

/**
 * Delete a fitness video (admin only)
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
        
        // Delete video (soft delete)
        await deleteFitnessVideo(id);

        return respData({ success: true });
    } catch (e: any) {
        console.error('[Admin Video Library Videos] DELETE failed:', e);
        return respErr(e.message || 'Failed to delete video', 500);
    }
}
