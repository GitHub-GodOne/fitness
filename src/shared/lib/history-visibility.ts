import { Configs } from '@/shared/models/config';
import {
  Subscription,
  SubscriptionStatus,
} from '@/shared/models/subscription';

const HISTORY_ELIGIBLE_SUBSCRIPTION_STATUSES = new Set<string>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PENDING_CANCEL,
  SubscriptionStatus.CANCELED,
  SubscriptionStatus.EXPIRED,
]);

type TaskHistoryAccessSnapshot = {
  keepFullAfterExpiryEligible?: boolean;
  subscriptionNo?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  capturedAt?: string | null;
};

function parseTaskHistoryAccessSnapshot(taskOptions?: string | null) {
  if (!taskOptions) {
    return null;
  }

  try {
    const parsed = JSON.parse(taskOptions) as Record<string, any>;
    const snapshot = parsed?.__subscriptionHistoryAccess;
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    return snapshot as TaskHistoryAccessSnapshot;
  } catch {
    return null;
  }
}

export function withTaskHistoryAccessSnapshot({
  options,
  currentSubscription,
}: {
  options?: Record<string, any> | null;
  currentSubscription?: Subscription | null;
}) {
  const nextOptions = {
    ...(options || {}),
  } as Record<string, any>;

  nextOptions.__subscriptionHistoryAccess = {
    keepFullAfterExpiryEligible: Boolean(currentSubscription),
    subscriptionNo: currentSubscription?.subscriptionNo || null,
    currentPeriodStart: currentSubscription?.currentPeriodStart
      ? new Date(currentSubscription.currentPeriodStart).toISOString()
      : null,
    currentPeriodEnd: currentSubscription?.currentPeriodEnd
      ? new Date(currentSubscription.currentPeriodEnd).toISOString()
      : null,
    capturedAt: new Date().toISOString(),
  } satisfies TaskHistoryAccessSnapshot;

  return nextOptions;
}

export function canViewFullHistoryForTask({
  taskCreatedAt,
  taskOptions,
  currentSubscription,
  subscriptions,
  configs,
}: {
  taskCreatedAt?: Date | string | null;
  taskOptions?: string | null;
  currentSubscription?: Subscription | null;
  subscriptions?: Subscription[];
  configs?: Configs | null;
}) {
  if (currentSubscription) {
    return true;
  }

  if (configs?.video_history_keep_full_after_expiry !== 'true') {
    return false;
  }

  const snapshot = parseTaskHistoryAccessSnapshot(taskOptions);
  if (snapshot?.keepFullAfterExpiryEligible) {
    return true;
  }

  if (!taskCreatedAt || !subscriptions || subscriptions.length === 0) {
    return false;
  }

  const createdAt =
    taskCreatedAt instanceof Date ? taskCreatedAt : new Date(taskCreatedAt);
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  return subscriptions.some((subscription) => {
    if (
      !subscription.status ||
      !HISTORY_ELIGIBLE_SUBSCRIPTION_STATUSES.has(subscription.status)
    ) {
      return false;
    }

    if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
      return false;
    }

    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);

    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime())
    ) {
      return false;
    }

    return createdAt >= periodStart && createdAt <= periodEnd;
  });
}
