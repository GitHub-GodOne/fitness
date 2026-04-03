import { and, count, desc, eq, gt, inArray, isNull, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { subscription } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import { appendUserToResult, User } from './user';

export type Subscription = typeof subscription.$inferSelect & {
  user?: User;
};
export type NewSubscription = typeof subscription.$inferInsert;
export type UpdateSubscription = Partial<
  Omit<NewSubscription, 'id' | 'subscriptionNo' | 'createdAt'>
>;

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PENDING_CANCEL = 'pending_cancel',
  TRIALING = 'trialing',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

function calculateSubscriptionPeriodEnd({
  start,
  interval,
  intervalCount,
}: {
  start: Date;
  interval: string;
  intervalCount: number;
}) {
  const end = new Date(start);

  switch (interval) {
    case 'year':
      end.setFullYear(end.getFullYear() + intervalCount);
      break;
    case 'week':
      end.setDate(end.getDate() + intervalCount * 7);
      break;
    case 'day':
      end.setDate(end.getDate() + intervalCount);
      break;
    case 'month':
    default:
      end.setMonth(end.getMonth() + intervalCount);
      break;
  }

  return end;
}

/**
 * create subscription
 */
export async function createSubscription(newSubscription: NewSubscription) {
  const [result] = await db()
    .insert(subscription)
    .values(newSubscription)
    .returning();
  return result;
}

/**
 * update subscription by subscription no
 */
export async function updateSubscriptionBySubscriptionNo(
  subscriptionNo: string,
  updateSubscription: UpdateSubscription
) {
  const [result] = await db()
    .update(subscription)
    .set(updateSubscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo))
    .returning();

  return result;
}

export async function updateSubscriptionById(
  id: string,
  updateSubscription: UpdateSubscription
) {
  const [result] = await db()
    .update(subscription)
    .set(updateSubscription)
    .where(eq(subscription.id, id))
    .returning();
  return result;
}

/**
 * find subscription by id
 */
export async function findSubscriptionById(id: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.id, id));

  return result;
}

/**
 * find subscription by subscription no
 */
export async function findSubscriptionBySubscriptionNo(subscriptionNo: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo));

  return result;
}

export async function findSubscriptionByProviderSubscriptionId({
  provider,
  subscriptionId,
}: {
  provider: string;
  subscriptionId: string;
}) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.paymentProvider, provider),
        eq(subscription.subscriptionId, subscriptionId)
      )
    );

  return result;
}

/**
 * get subscriptions
 */
export async function getSubscriptions({
  userId,
  status,
  interval,
  getUser,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  status?: string;
  getUser?: boolean;
  interval?: string;
  page?: number;
  limit?: number;
}): Promise<Subscription[]> {
  const result = await db()
    .select()
    .from(subscription)
    .where(
      and(
        userId ? eq(subscription.userId, userId) : undefined,
        status ? eq(subscription.status, status) : undefined,
        interval ? eq(subscription.interval, interval) : undefined
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

/**
 * get current subscription
 */
export async function getCurrentSubscription(userId: string) {
  const now = new Date();

  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        inArray(subscription.status, [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PENDING_CANCEL,
          SubscriptionStatus.TRIALING,
        ]),
        or(
          isNull(subscription.currentPeriodEnd),
          gt(subscription.currentPeriodEnd, now)
        )
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(1);

  return result;
}

/**
 * get subscriptions count
 */
export async function getSubscriptionsCount({
  userId,
  status,
  interval,
}: {
  userId?: string;
  status?: string;
  interval?: string;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(subscription)
    .where(
      and(
        userId ? eq(subscription.userId, userId) : undefined,
        status ? eq(subscription.status, status) : undefined,
        interval ? eq(subscription.interval, interval) : undefined
      )
    );

  return result?.count || 0;
}

export async function grantManualSubscriptionForUser({
  user,
  accessTier,
  interval,
  intervalCount,
  amount,
  currency,
  description,
}: {
  user: User;
  accessTier: 'starter' | 'pro';
  interval: 'month' | 'year';
  intervalCount?: number;
  amount?: number;
  currency?: string;
  description?: string;
}) {
  const now = new Date();
  const normalizedIntervalCount =
    intervalCount && intervalCount > 0 ? intervalCount : 1;
  const normalizedCurrency = (currency || 'USD').trim().toUpperCase();
  const normalizedTier = accessTier === 'pro' ? 'pro' : 'starter';
  const productName =
    normalizedTier === 'pro' ? 'Pro Subscription' : 'Starter Subscription';
  const productId = `${normalizedTier}_subscription`;
  const subscriptionDescription =
    description?.trim() || `Admin granted ${productName}`;

  const newSubscription: NewSubscription = {
    id: getUuid(),
    subscriptionNo: getSnowId(),
    userId: user.id,
    userEmail: user.email,
    status: SubscriptionStatus.ACTIVE,
    paymentProvider: 'admin',
    subscriptionId: `admin_${getUuid()}`,
    subscriptionResult: JSON.stringify({
      source: 'admin_grant',
      accessTier: normalizedTier,
    }),
    productId,
    description: subscriptionDescription,
    amount: amount && amount > 0 ? amount : 0,
    currency: normalizedCurrency,
    interval,
    intervalCount: normalizedIntervalCount,
    currentPeriodStart: now,
    currentPeriodEnd: calculateSubscriptionPeriodEnd({
      start: now,
      interval,
      intervalCount: normalizedIntervalCount,
    }),
    planName: productName,
    productName,
  };

  await db().transaction(async (tx) => {
    const activeSubscriptions = await tx
      .select({ id: subscription.id })
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, user.id),
          inArray(subscription.status, [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PENDING_CANCEL,
            SubscriptionStatus.TRIALING,
          ])
        )
      );

    if (activeSubscriptions.length > 0) {
      await tx
        .update(subscription)
        .set({
          status: SubscriptionStatus.CANCELED,
          canceledAt: now,
          canceledEndAt: now,
          canceledReason: 'Replaced by admin granted subscription',
          canceledReasonType: 'admin_grant',
        })
        .where(
          inArray(
            subscription.id,
            activeSubscriptions.map((item) => item.id)
          )
        );
    }

    await tx.insert(subscription).values(newSubscription);
  });

  return newSubscription;
}
