import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
    createObjectVideoMapping,
    deleteObjectVideoMapping,
    getVideoMappings,
    getFitnessVideoGroupById,
    listFitnessObjects,
    listBodyParts,
} from '@/shared/models/video_library';

/**
 * Get all mappings for a video group (admin only)
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
        const videoGroupId = searchParams.get('videoGroupId');

        if (!videoGroupId) {
            // Return all objects and body parts for selection
            const [objects, bodyParts] = await Promise.all([
                listFitnessObjects({ status: 'active', limit: 1000 }),
                listBodyParts({ status: 'active', limit: 1000 }),
            ]);
            return respData({ objects, bodyParts });
        }

        const mappings = await getVideoMappings(videoGroupId);
        return respData({ mappings, videoGroupId });
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
        const { objectId, videoGroupId, bodyPartId, isPrimary } = body;

        if (!objectId || !videoGroupId || !bodyPartId) {
            return respErr('objectId, videoGroupId, and bodyPartId are required');
        }

        // Verify video group exists
        const videoGroup = await getFitnessVideoGroupById(videoGroupId);
        if (!videoGroup) {
            return respErr('video group not found', 404);
        }

        const newMapping = await createObjectVideoMapping({
            objectId,
            videoGroupId,
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
