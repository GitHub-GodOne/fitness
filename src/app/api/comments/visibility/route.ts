import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import { hasPermission } from '@/shared/services/rbac';
import {
    updateComment,
    updateCommentReply,
} from '@/shared/models/comment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user?.id) {
            return respErr('Unauthorized');
        }

        // Check admin permission
        const allowed = await hasPermission(
            session.user.id,
            'admin.comments.write'
        );

        if (!allowed) {
            return respErr('Forbidden');
        }

        const body = await req.json();
        const { id, type, status } = body; // type: 'comment' | 'reply', status: 'visible' | 'hidden'

        if (!id || !type || !status) {
            return respErr('Missing required parameters');
        }

        if (!['visible', 'hidden'].includes(status)) {
            return respErr('Invalid status value');
        }

        // Update using model
        if (type === 'comment') {
            await updateComment(id, { status });
        } else if (type === 'reply') {
            await updateCommentReply(id, { status });
        } else {
            return respErr('Invalid type');
        }

        return respData({
            message: `${type === 'comment' ? 'Comment' : 'Reply'} visibility updated to ${status}`,
        });
    } catch (error) {
        console.error('Error updating visibility:', error);
        return respErr('Failed to update visibility');
    }
}
