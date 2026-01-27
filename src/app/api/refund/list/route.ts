import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getAllRefundRequests, getRefundRequestsCount } from '@/shared/models/refund-request';
import { hasPermission } from '@/shared/services/rbac';

/**
 * Get all refund requests (admin only)
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        // Check admin permission
        const canView = await hasPermission(user.id, 'admin.refund.view');
        if (!canView) {
            return respErr('no permission', 403);
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || undefined;
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '30', 10);

        const requests = await getAllRefundRequests(status, true, page, limit);
        const total = await getRefundRequestsCount(status);

        return respData({
            requests,
            total,
            page,
            limit,
        });
    } catch (e: any) {
        console.error('[Refund List] Failed:', e);
        return respErr(e.message || 'Failed to get refund requests', 500);
    }
}
