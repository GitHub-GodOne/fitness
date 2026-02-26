import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
    createObjectVideoMapping,
    deleteObjectVideoMapping,
    getVideoMappings,
    getFitnessVideoById,
    listFitnessObjects,
    listBodyParts,
} from '@/shared/models/video_library';

/**
 * Get all mappings for a video (admin only)
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
        const videoId = searchParams.get('videoId');

        if (!videoId) {
            // Return all objects and body parts for selection
            const [objects, bodyParts] = await Promise.all([
                listFitnessObjects({ status: 'active', limit: 1000 }),
                listBodyParts({ status: 'active', limit: 1000 }),
            ]);
            return respData({ objects, bodyParts });
        }

        const mappings = await getVideoMappings(videoId);
        return respData({ mappings, videoId });
    } catch (e: any) {
        console.error('[Admin Video Library Mappings] GET failed:', e);
        return respErr(e.message || 'Failed to get mappings', 500);
    }
}

/**
 * Create a new mapping (admin only)
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
        const { objectId, videoId, bodyPartId, isPrimary } = body;

        if (!objectId || !videoId || !bodyPartId) {
            return respErr('objectId, videoId, and bodyPartId are required');
        }

        // Verify video exists
        const video = await getFitnessVideoById(videoId);
        if (!video) {
            return respErr('video not found', 404);
        }

        const newMapping = await createObjectVideoMapping({
            objectId,
            videoId,
            bodyPartId,
            isPrimary,
        });

        return respData({ mapping: newMapping });
    } catch (e: any) {
        console.error('[Admin Video Library Mappings] POST failed:', e);
        return respErr(e.message || 'Failed to create mapping', 500);
    }
}

/**
 * Delete a mapping (admin only)
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

        await deleteObjectVideoMapping(id);

        return respData({ success: true });
    } catch (e: any) {
        console.error('[Admin Video Library Mappings] DELETE failed:', e);
        return respErr(e.message || 'Failed to delete mapping', 500);
    }
}
