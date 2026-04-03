import { Configs } from '@/shared/models/config';

type PricingRuntimeCopy = {
  one_time?: {
    unit?: string;
    tip?: string;
    items?: Record<string, Partial<PricingItemLike>>;
  };
  subscription_monthly?: {
    unit?: string;
    tip?: string;
    items?: Record<string, Partial<PricingItemLike>>;
  };
};

type PricingItemLike = {
  product_id?: string;
  amount?: number;
  interval?: string;
  unit?: string;
  tip?: string;
  plan_name?: string;
  [key: string]: any;
};

type PricingSectionLike<TItem = PricingItemLike> = {
  items?: TItem[];
  [key: string]: any;
};

export type PaidPricingMode = 'one_time' | 'subscription_monthly';

export function resolvePaidPricingMode(configs?: Configs | null): PaidPricingMode {
  return configs?.pricing_paid_mode === 'one_time'
    ? 'one_time'
    : 'subscription_monthly';
}

function isFreePricingItem(item: PricingItemLike) {
  return (item.amount || 0) <= 0 || item.product_id === 'free';
}

export function applyPricingRuntimeSettings<TItem extends PricingItemLike>(
  pricingSection: PricingSectionLike<TItem>,
  configs?: Configs | null,
  runtimeCopy?: PricingRuntimeCopy,
): PricingSectionLike<TItem> {
  const paidPricingMode = resolvePaidPricingMode(configs);

  return {
    ...pricingSection,
    items: (pricingSection.items || []).map((item) => {
      if (isFreePricingItem(item)) {
        return item;
      }

      if (paidPricingMode === 'one_time') {
        const itemOverride = runtimeCopy?.one_time?.items?.[item.product_id || ''];
        return {
          ...item,
          ...itemOverride,
          interval: 'one-time',
          unit: itemOverride?.unit ?? runtimeCopy?.one_time?.unit ?? '',
          tip: itemOverride?.tip ?? runtimeCopy?.one_time?.tip ?? item.tip,
        };
      }

      const itemOverride =
        runtimeCopy?.subscription_monthly?.items?.[item.product_id || ''];
      return {
        ...item,
        ...itemOverride,
        interval: 'month',
        unit:
          itemOverride?.unit ??
          runtimeCopy?.subscription_monthly?.unit ??
          item.unit,
        tip:
          itemOverride?.tip ??
          runtimeCopy?.subscription_monthly?.tip ??
          item.tip,
        plan_name: itemOverride?.plan_name || item.plan_name || item.product_id,
      };
    }) as TItem[],
  };
}
