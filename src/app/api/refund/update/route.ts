import { NextRequest } from 'next/server';

import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { findRefundRequestById, updateRefundRequestById } from '@/shared/models/refund-request';
import { RefundRequestStatus } from '@/shared/types/refund';
import { hasPermission } from '@/shared/services/rbac';

/**
 * Update refund request (admin only)
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getUserInfo();
        if (!user) {
            return respErr('no auth, please sign in');
        }

        // Check admin permission
        const canUpdate = await hasPermission(user.id, 'admin.refund.update');
        if (!canUpdate) {
            return respErr('no permission', 403);
        }

        const { requestId, status, approvedCreditsAmount, adminNotes } = await req.json();

        if (!requestId) {
            return respErr('requestId is required', 400);
        }

        const refundRequest = await findRefundRequestById(requestId);
        if (!refundRequest) {
            return respErr('refund request not found', 404);
        }

        // Validate status
        if (status && !Object.values(RefundRequestStatus).includes(status)) {
            return respErr('invalid status', 400);
        }

        // Validate approved credits amount
        if (approvedCreditsAmount !== undefined && approvedCreditsAmount !== null) {
            if (typeof approvedCreditsAmount !== 'number' || approvedCreditsAmount < 0) {
                return respErr('approvedCreditsAmount must be a non-negative number', 400);
            }
        }

        // Update refund request
        const updateData: any = {};
        if (status) {
            updateData.status = status;
            if (status === RefundRequestStatus.COMPLETED || status === RefundRequestStatus.REJECTED) {
                updateData.processedAt = new Date();
                updateData.processedBy = user.id;
            }
        }
        if (approvedCreditsAmount !== undefined) {
            updateData.approvedCreditsAmount = approvedCreditsAmount;
        }
        if (adminNotes !== undefined) {
            updateData.adminNotes = adminNotes;
        }

        const updated = await updateRefundRequestById(requestId, updateData);
        if (!updated) {
            return respErr('failed to update refund request', 500);
        }

        return respData(updated);
    } catch (e: any) {
        console.error('[Refund Update] Failed:', e);
        return respErr(e.message || 'Failed to update refund request', 500);
    }
}
