import { NextRequest } from 'next/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import { grantCreditsForUser } from '@/shared/models/credit';
import { findUserById } from '@/shared/models/user';

/**
 * API endpoint to grant credits to a user
 * POST /api/admin/credits/grant
 */
export async function POST(req: NextRequest) {
    try {
        // Check admin permission
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session?.user?.id) {
            return Response.json(
                { code: -1, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check permission
        await requirePermission({
            code: PERMISSIONS.CREDITS_WRITE,
            redirectUrl: '/admin/no-permission',
            locale: 'en',
        });

        // Parse request body
        let body;
        try {
            body = await req.json();
        } catch (jsonError) {
            console.error('[Admin Credits Grant] JSON parse error:', jsonError);
            return Response.json(
                { code: -1, message: 'Invalid JSON format' },
                { status: 400 }
            );
        }

        const { userId, credits, validDays, description } = body;

        // Validate input
        if (!userId) {
            return Response.json(
                { code: -1, message: 'User ID is required' },
                { status: 400 }
            );
        }

        if (!credits || typeof credits !== 'number' || credits <= 0) {
            return Response.json(
                { code: -1, message: 'Credits amount must be a positive number' },
                { status: 400 }
            );
        }

        // Find user
        const user = await findUserById(userId);
        if (!user) {
            return Response.json(
                { code: -1, message: 'User not found' },
                { status: 404 }
            );
        }

        // Validate validDays
        const validDaysNum = validDays ? parseInt(String(validDays), 10) : 0;
        if (validDaysNum < 0 || isNaN(validDaysNum)) {
            return Response.json(
                { code: -1, message: 'Valid days must be a non-negative number' },
                { status: 400 }
            );
        }

        // Grant credits
        try {
            const newCredit = await grantCreditsForUser({
                user,
                credits,
                validDays: validDaysNum > 0 ? validDaysNum : undefined,
                description: description?.trim() || undefined,
            });

            if (!newCredit) {
                return Response.json(
                    { code: -1, message: 'Failed to grant credits: invalid credits amount' },
                    { status: 400 }
                );
            }

            return respData({
                id: newCredit.id,
                transactionNo: newCredit.transactionNo,
                message: 'Credits granted successfully',
            });
        } catch (dbError) {
            console.error('[Admin Credits Grant] Database error:', dbError);
            return Response.json(
                { code: -1, message: 'Failed to grant credits due to database error' },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('[Admin Credits Grant] Unexpected error:', error);

        // Handle permission errors
        if (error.message?.includes('permission') || error.message?.includes('Permission')) {
            return Response.json(
                { code: -1, message: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        return Response.json(
            { code: -1, message: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
