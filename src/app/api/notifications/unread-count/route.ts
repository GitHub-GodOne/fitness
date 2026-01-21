import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import { getUnreadCount } from '@/shared/models/notification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user?.id) {
            return respErr('Unauthorized', 401);
        }

        const unreadCount = await getUnreadCount(session.user.id);

        return respData({ unreadCount });
    } catch (error) {
        console.error('[Notifications Unread Count] Error:', error);
        return respErr('Failed to fetch unread count', 500);
    }
}
