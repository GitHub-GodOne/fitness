export type VideoAccessTier = "free" | "starter" | "pro";

type SubscriptionLike = {
  productId?: string | null;
  productName?: string | null;
  planName?: string | null;
};

export function normalizeVideoAccessTier(
  value?: string | null,
): VideoAccessTier | "hidden" {
  const normalized = (value || "").trim().toLowerCase();

  if (normalized === "hidden") {
    return "hidden";
  }

  if (normalized === "pro" || normalized === "premium") {
    return "pro";
  }

  if (normalized === "starter") {
    return "starter";
  }

  return "free";
}

export function getAllowedVideoAccessTiers(
  tier?: string | null,
): VideoAccessTier[] {
  const normalized = normalizeVideoAccessTier(tier);

  if (normalized === "pro") {
    return ["free", "starter", "pro"];
  }

  if (normalized === "starter") {
    return ["free", "starter"];
  }

  return ["free"];
}

export function resolveVideoAccessTierFromSubscription(
  subscription?: SubscriptionLike | null,
): VideoAccessTier {
  if (!subscription) {
    return "free";
  }

  const haystack = [
    subscription.productId,
    subscription.productName,
    subscription.planName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    haystack.includes("pro") ||
    haystack.includes("premium") ||
    haystack.includes("credits_60")
  ) {
    return "pro";
  }

  if (
    haystack.includes("starter") ||
    haystack.includes("credits_20")
  ) {
    return "starter";
  }

  return "starter";
}
