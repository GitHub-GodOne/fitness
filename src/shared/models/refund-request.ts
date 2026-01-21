import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { refundRequest } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { RefundRequestStatus } from '@/shared/types/refund';

import { appendUserToResult, User } from './user';

export type RefundRequest = typeof refundRequest.$inferSelect & {
    user?: User;
};
export type NewRefundRequest = typeof refundRequest.$inferInsert;
export type UpdateRefundRequest = Partial<
    Omit<NewRefundRequest, 'id' | 'createdAt'>
>;

// Re-export for backward compatibility
export { RefundRequestStatus };

/**
 * Create a new refund request
 */
export async function createRefundRequest(
    data: Omit<NewRefundRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<RefundRequest> {
    const id = getUuid();
    const now = new Date();

    const [result] = await db()
        .insert(refundRequest)
        .values({
            id,
            ...data,
            createdAt: now,
            updatedAt: now,
        })
        .returning();

    return result;
}

/**
 * Find refund request by ID
 */
export async function findRefundRequestById(
    id: string,
    getUser = false
): Promise<RefundRequest | null> {
    const result = await db()
        .select()
        .from(refundRequest)
        .where(and(eq(refundRequest.id, id), isNull(refundRequest.deletedAt)))
        .limit(1);

    if (result.length === 0) {
        return null;
    }

    if (getUser) {
        const withUsers = await appendUserToResult(result);
        return withUsers[0] || null;
    }

    return result[0] || null;
}

/**
 * Get refund requests by user ID
 */
export async function getRefundRequestsByUserId(
    userId: string,
    getUser = false
): Promise<RefundRequest[]> {
    const result = await db()
        .select()
        .from(refundRequest)
        .where(
            and(
                eq(refundRequest.userId, userId),
                isNull(refundRequest.deletedAt)
            )
        )
        .orderBy(desc(refundRequest.createdAt));

    if (getUser) {
        return appendUserToResult(result);
    }

    return result;
}

/**
 * Get all refund requests (for admin)
 */
export async function getAllRefundRequests(
    status?: string,
    getUser = false,
    page = 1,
    limit = 30
): Promise<RefundRequest[]> {
    const conditions = [isNull(refundRequest.deletedAt)];
    if (status) {
        conditions.push(eq(refundRequest.status, status));
    }

    const result = await db()
        .select()
        .from(refundRequest)
        .where(and(...conditions))
        .orderBy(desc(refundRequest.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

    if (getUser) {
        return await appendUserToResult(result);
    }

    return result;
}

/**
 * Update refund request by ID
 */
export async function updateRefundRequestById(
    id: string,
    data: UpdateRefundRequest
): Promise<RefundRequest | null> {
    const [result] = await db()
        .update(refundRequest)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(and(eq(refundRequest.id, id), isNull(refundRequest.deletedAt)))
        .returning();

    return result || null;
}

/**
 * Get refund requests count (for admin)
 */
export async function getRefundRequestsCount(
    status?: string
): Promise<number> {
    const conditions = [isNull(refundRequest.deletedAt)];
    if (status) {
        conditions.push(eq(refundRequest.status, status));
    }

    const result = await db()
        .select()
        .from(refundRequest)
        .where(and(...conditions));

    return result.length;
}
