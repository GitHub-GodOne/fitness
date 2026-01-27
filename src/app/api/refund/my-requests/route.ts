import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getRefundRequestsByUserId } from '@/shared/models/refund-request';

/**
 * Get current user's refund requests
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        const requests = await getRefundRequestsByUserId(user.id, false);

        return respData(requests);
    } catch (e: any) {
        console.error('[My Refund Requests] Failed:', e);
        return respErr(e.message || 'Failed to get refund requests', 500);
    }
}
