import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';
import {
    createFitnessObject,
    listFitnessObjects,
    updateFitnessObject,
    deleteFitnessObject,
} from '@/shared/models/video_library';

/**
 * Get all fitness objects (admin only)
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
        const category = searchParams.get('category') || undefined;
        const search = searchParams.get('search') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        const objects = await listFitnessObjects({
            status,
            category,
            search,
            page,
            limit,
        });

        return respData({ objects, page, limit });
    } catch (e: any) {
        console.error('[Admin Video Library Objects] GET failed:', e);
        return respErr(e.message || 'Failed to get objects', 500);
    }
}

/**
 * Create a new fitness object (admin only)
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
        const { name, nameZh, aliases, category, description, image, status, priority } = body;

        if (!name || !category) {
            return respErr('name and category are required');
        }

        const newObject = await createFitnessObject({
            name,
            nameZh,
            aliases,
            category,
            description,
            image,
            status,
            priority,
        });

        return respData({ object: newObject });
    } catch (e: any) {
        console.error('[Admin Video Library Objects] POST failed:', e);
        return respErr(e.message || 'Failed to create object', 500);
    }
}

/**
 * Update a fitness object (admin only)
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
        const { id, name, nameZh, aliases, category, description, image, status, priority } = body;

        if (!id) {
            return respErr('id is required');
        }

        const updatedObject = await updateFitnessObject(id, {
            name,
            nameZh,
            aliases,
            category,
            description,
            image,
            status,
            priority,
        });

        return respData({ object: updatedObject });
    } catch (e: any) {
        console.error('[Admin Video Library Objects] PUT failed:', e);
        return respErr(e.message || 'Failed to update object', 500);
    }
}

/**
 * Delete a fitness object (admin only)
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

        await deleteFitnessObject(id);

        return respData({ success: true });
    } catch (e: any) {
        console.error('[Admin Video Library Objects] DELETE failed:', e);
        return respErr(e.message || 'Failed to delete object', 500);
    }
}
