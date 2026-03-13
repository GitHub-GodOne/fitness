'use client';

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { locales } from '@/config/locale';
import { usePathname } from '@/core/i18n/navigation';
import { SignModal } from '@/shared/blocks/sign/sign-modal';
import { useAppContext } from '@/shared/contexts/app';
import {
  matchesGuestAccessPath,
  normalizeGuestAccessPath,
} from '@/shared/lib/guest-access';

function stripLocalePrefix(pathname: string) {
  const normalizedPath = normalizeGuestAccessPath(pathname);
  if (!normalizedPath || normalizedPath === '/') {
    return '/';
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    const stripped = `/${segments.slice(1).join('/')}`;
    return normalizeGuestAccessPath(stripped) || '/';
  }

  return normalizedPath;
}

export function GuestPageAccessGuard({
  enabled,
  protectedPaths,
  children,
}: {
  enabled: boolean;
  protectedPaths: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { user, sessionUser, isCheckSign, setIsShowSignModal } = useAppContext();
  const openedPathRef = useRef<string | null>(null);
  const [serverAccessState, setServerAccessState] = useState<
    'idle' | 'checking' | 'allowed' | 'blocked'
  >('idle');

  const normalizedPathname = useMemo(
    () => stripLocalePrefix(pathname || '/'),
    [pathname]
  );

  const isAuthenticated = !!user || !!sessionUser;
  const isProtectedPath =
    enabled && matchesGuestAccessPath(normalizedPathname, protectedPaths);

  useEffect(() => {
    setServerAccessState('idle');
  }, [normalizedPathname]);

  useEffect(() => {
    if (isAuthenticated) {
      if (openedPathRef.current === normalizedPathname) {
        setIsShowSignModal(false);
      }
      openedPathRef.current = null;
      setServerAccessState('allowed');
      return;
    }

    if (isCheckSign) {
      setServerAccessState('checking');
      return;
    }

    if (!isProtectedPath) {
      openedPathRef.current = null;
      setServerAccessState('allowed');
      return;
    }

    let cancelled = false;

    const checkServerSession = async () => {
      setServerAccessState('checking');

      try {
        const response = await fetch('/api/user/get-user-info', {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
        });
        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (result?.code === 0 && result?.data?.id) {
          if (openedPathRef.current === normalizedPathname) {
            setIsShowSignModal(false);
          }
          openedPathRef.current = null;
          setServerAccessState('allowed');
          return;
        }
      } catch {
        if (cancelled) {
          return;
        }
      }

      if (openedPathRef.current !== normalizedPathname) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('signInCallbackUrl', normalizedPathname);
        }

        setIsShowSignModal(true);
        openedPathRef.current = normalizedPathname;
      }

      setServerAccessState('blocked');
    };

    void checkServerSession();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    isCheckSign,
    isProtectedPath,
    normalizedPathname,
    setIsShowSignModal,
  ]);

  if (isProtectedPath && (isCheckSign || serverAccessState === 'checking')) {
    return <div className="min-h-[calc(100vh-5rem)] w-full" />;
  }

  if (isProtectedPath && serverAccessState === 'blocked') {
    return (
      <>
        <SignModal callbackUrl={normalizedPathname} />
        <div className="min-h-[calc(100vh-5rem)] w-full" />
      </>
    );
  }

  return <>{children}</>;
}
