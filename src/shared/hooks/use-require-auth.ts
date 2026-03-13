"use client";

import { useCallback } from "react";
import { useRouter } from "@/core/i18n/navigation";
import { useAppContext } from "@/shared/contexts/app";

interface UseRequireAuthOptions {
  callbackUrl?: string;
}

function normalizeInternalPath(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (/^[a-z]+:\/\//i.test(trimmed)) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { user, setIsShowSignModal } = useAppContext();
  const router = useRouter();
  const { callbackUrl = "/ai-video-generator" } = options;
  const defaultCallbackUrl =
    normalizeInternalPath(callbackUrl) || "/ai-video-generator";

  const requireAuth = useCallback(
    (action: () => void, requestedUrl?: string) => {
      if (user) {
        action();
      } else {
        const intendedUrl =
          normalizeInternalPath(requestedUrl) || defaultCallbackUrl;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("signInCallbackUrl", intendedUrl);
        }
        setIsShowSignModal(true);
      }
    },
    [defaultCallbackUrl, setIsShowSignModal, user]
  );

  const navigateWithAuth = useCallback(
    (url: string) => {
      const normalizedUrl = normalizeInternalPath(url) || defaultCallbackUrl;
      router.push(normalizedUrl);
    },
    [defaultCallbackUrl, router]
  );

  return { requireAuth, navigateWithAuth, isAuthenticated: !!user };
}
