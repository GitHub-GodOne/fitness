"use client";

import { useCallback } from "react";
import { useRouter } from "@/core/i18n/navigation";
import { useAppContext } from "@/shared/contexts/app";

interface UseRequireAuthOptions {
  callbackUrl?: string;
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { user, setIsShowSignModal } = useAppContext();
  const router = useRouter();
  const { callbackUrl = "/ai-video-generator" } = options;

  const requireAuth = useCallback(
    (action: () => void) => {
      if (user) {
        // User is logged in, execute the action
        action();
      } else {
        // User is not logged in, show sign modal
        // Store the intended destination for after login
        if (typeof window !== "undefined") {
          sessionStorage.setItem("signInCallbackUrl", callbackUrl);
        }
        setIsShowSignModal(true);
      }
    },
    [user, setIsShowSignModal, callbackUrl]
  );

  const navigateWithAuth = useCallback(
    (url: string) => {
      requireAuth(() => {
        router.push(url);
      });
    },
    [requireAuth, router]
  );

  return { requireAuth, navigateWithAuth, isAuthenticated: !!user };
}
