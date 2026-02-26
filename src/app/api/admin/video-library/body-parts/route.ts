import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
    createBodyPart,
    listBodyParts,
    updateBodyPart,
    deleteBodyPart,
} from '@/shared/models/video_library';

/**
 * Get all body parts (admin only)
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
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        const bodyParts = await listBodyParts({
            status,
            page,
            limit,
        });

        return respData({ bodyParts, page, limit });
    } catch (e: any) {
        console.error('[Admin Video Library BodyParts] GET failed:', e);
        return respErr(e.message || 'Failed to get body parts', 500);
    }
}

/**
 * Create a new body part (admin only)
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
        const { name, nameZh, icon, description, status, sort } = body;

        if (!name) {
            return respErr('name is required');
        }

        const newBodyPart = await createBodyPart({
            name,
            nameZh,
            icon,
            description,
            status,
            sort,
        });

        return respData({ bodyPart: newBodyPart });
    } catch (e: any) {
        console.error('[Admin Video Library BodyParts] POST failed:', e);
        return respErr(e.message || 'Failed to create body part', 500);
    }
}

/**
 * Update a body part (admin only)
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
        const { id, name, nameZh, icon, description, status, sort } = body;

        if (!id) {
            return respErr('id is required');
        }

        const updatedBodyPart = await updateBodyPart(id, {
            name,
            nameZh,
            icon,
            description,
            status,
            sort,
        });

        return respData({ bodyPart: updatedBodyPart });
    } catch (e: any) {
        console.error('[Admin Video Library BodyParts] PUT failed:', e);
        return respErr(e.message || 'Failed to update body part', 500);
    }
}

/**
 * Delete a body part (admin only)
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

        await deleteBodyPart(id);

        return respData({ success: true });
    } catch (e: any) {
        console.error('[Admin Video Library BodyParts] DELETE failed:', e);
        return respErr(e.message || 'Failed to delete body part', 500);
    }
}
