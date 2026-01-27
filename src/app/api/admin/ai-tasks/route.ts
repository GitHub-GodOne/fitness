import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import { hasPermission } from '@/shared/services/rbac';

/**
 * Get all AI tasks (admin only)
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        // Check admin permission
        const canView = await hasPermission(user.id, 'admin.ai-tasks.read');
        if (!canView) {
            return respErr('no permission', 403);
        }

        const { searchParams } = new URL(req.url);
        const mediaType = searchParams.get('mediaType') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '30', 10);

        const total = await getAITasksCount({
            mediaType,
        });

        const tasks = await getAITasks({
            getUser: true,
            page,
            limit,
            mediaType,
        });

        return respData({
            tasks,
            total,
            page,
            limit,
        });
    } catch (e: any) {
        console.error('[Admin AI Tasks] Failed:', e);
        return respErr(e.message || 'Failed to get AI tasks', 500);
    }
}
