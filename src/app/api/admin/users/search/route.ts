import { NextRequest } from 'next/server';
import { desc, or, ilike } from 'drizzle-orm';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { respData } from '@/shared/lib/resp';

/**
 * API endpoint to search users by email or name
 * GET /api/admin/users/search?q=search_term&limit=10
 */
export async function GET(req: NextRequest) {
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
            code: PERMISSIONS.USERS_READ,
            redirectUrl: '/admin/no-permission',
            locale: 'en',
        });

        // Get query parameters
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get('q') || '';
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        // Validate limit
        if (isNaN(limit) || limit < 1 || limit > 50) {
            return Response.json(
                { code: -1, message: 'Limit must be between 1 and 50' },
                { status: 400 }
            );
        }

        // If no query, return empty array
        if (!query.trim()) {
            return respData([]);
        }

        // Search users by email or name using fuzzy search (ILIKE for case-insensitive)
        const searchTerm = `%${query.trim()}%`;

        // Build search conditions
        const conditions = [
            ilike(user.email, searchTerm), // Case-insensitive email search
        ];

        // Add name search if name column exists (handle potential null values)
        // Note: ilike handles null values, so we can safely add it
        conditions.push(ilike(user.name, searchTerm));

        const users = await db()
            .select({
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
            })
            .from(user)
            .where(or(...conditions))
            .orderBy(desc(user.createdAt))
            .limit(limit);

        // Return simplified user data for selection
        const simplifiedUsers = users.map((user) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
        }));

        return respData(simplifiedUsers);
    } catch (error: any) {
        console.error('[Admin Users Search] Unexpected error:', error);

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
