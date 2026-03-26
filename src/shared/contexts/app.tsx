'use client';

import {
  useCallback,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getAuthClient, useSession } from '@/core/auth/client';
import { usePathname, useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import {
  I18N_OVERRIDES_PENDING_KEY,
  I18N_OVERRIDES_UPDATED_EVENT,
} from '@/shared/lib/i18n-refresh';
import { User } from '@/shared/models/user';

export interface ContextValue {
  user: User | null;
  sessionUser: User | null;
  isCheckSign: boolean;
  isConfigsLoaded: boolean;
  unreadNotificationCount: number;
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  isShowPaymentModal: boolean;
  setIsShowPaymentModal: (show: boolean) => void;
  configs: Record<string, string>;
  fetchConfigs: () => Promise<void>;
  refreshUnreadNotificationCount: () => Promise<void>;
  fetchUserCredits: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
  needsPassword: boolean;
}

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({
  children,
  initialConfigs,
}: {
  children: ReactNode;
  initialConfigs?: Record<string, string>;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const hasInitialConfigs = initialConfigs !== undefined;
  const [configs, setConfigs] = useState<Record<string, string>>(
    initialConfigs ?? {}
  );
  const [isConfigsLoaded, setIsConfigsLoaded] = useState(hasInitialConfigs);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // sign user
  const [user, setUser] = useState<User | null>(null);

  // session
  const { data: session, isPending } = useSession();
  const sessionUser = (session?.user as User | null) || null;

  // is check sign (true during SSR and initial render to avoid hydration mismatch when auth is enabled)
  const [isCheckSign, setIsCheckSign] = useState(!!envConfigs.auth_secret);

  // show sign modal
  const [isShowSignModal, setIsShowSignModal] = useState(false);

  // show payment modal
  const [isShowPaymentModal, setIsShowPaymentModal] = useState(false);

  const fetchConfigs = useCallback(async function () {
    try {
      const resp = await fetch('/api/config/get-configs', {
        method: 'POST',
        cache: 'no-store',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setConfigs(data);
    } catch (e) {
      console.log('fetch configs failed:', e);
    } finally {
      setIsConfigsLoaded(true);
    }
  }, []);

  const refreshUnreadNotificationCount = useCallback(async function () {
    if (!user || configs.notification_bell_enabled === 'false') {
      setUnreadNotificationCount(0);
      return;
    }

    try {
      const response = await fetch('/api/notifications/unread-count', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`fetch failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.code === 0) {
        setUnreadNotificationCount(data.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [configs.notification_bell_enabled, user]);

  const fetchUserCredits = async function () {
    try {
      if (!user) {
        return;
      }

      const resp = await fetch('/api/user/get-user-credits', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser({ ...user, credits: data });
    } catch (e) {
      console.log('fetch user credits failed:', e);
    }
  };

  const fetchUserInfo = async function () {
    try {
      const resp = await fetch('/api/user/get-user-info', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
    } catch (e) {
      console.log('fetch user info failed:', e);
    }
  };

  const showOneTap = async function (configs: Record<string, string>) {
    try {
      const authClient = getAuthClient(configs);
      await authClient.oneTap({
        callbackURL: '/',
        onPromptNotification: (notification: any) => {
          // Handle prompt dismissal silently
          // This callback is triggered when the prompt is dismissed or skipped
          console.log('One Tap prompt notification:', notification);
        },
        // fetchOptions: {
        //   onSuccess: () => {
        //     router.push('/');
        //   },
        // },
      });
    } catch (error) {
      // Silently handle One Tap cancellation errors
      // These errors occur when users close the prompt or decline to sign in
      // Common errors: FedCM NetworkError, AbortError, etc.
    }
  };

  useEffect(() => {
    if (hasInitialConfigs) {
      return;
    }

    setIsConfigsLoaded(false);
    void fetchConfigs();
  }, [fetchConfigs, hasInitialConfigs]);

  useEffect(() => {
    const sessionUser = session?.user;
    const currentUserId = user?.id;
    const sessionUserId = sessionUser?.id;

    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser as User);
      fetchUserInfo();
    } else if (!sessionUser && currentUserId) {
      setUser(null);
    }
  }, [session?.user?.id, user?.id]);

  // one tap initialized
  const oneTapInitialized = useRef(false);

  useEffect(() => {
    if (
      configs &&
      configs.google_client_id &&
      configs.google_one_tap_enabled === 'true' &&
      !session &&
      !isPending &&
      !oneTapInitialized.current
    ) {
      oneTapInitialized.current = true;
      showOneTap(configs);
    }
  }, [configs, session, isPending]);

  useEffect(() => {
    if (user && !user.credits) {
      // fetchUserCredits();
    }
  }, [user]);

  useEffect(() => {
    if (!isConfigsLoaded) {
      return;
    }

    if (!user || configs.notification_bell_enabled === 'false') {
      setUnreadNotificationCount(0);
      return;
    }

    void refreshUnreadNotificationCount();
    const interval = setInterval(() => {
      void refreshUnreadNotificationCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [
    configs.notification_bell_enabled,
    isConfigsLoaded,
    refreshUnreadNotificationCount,
    user,
  ]);

  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOverridesUpdated = () => {
      router.refresh();
    };

    window.addEventListener(I18N_OVERRIDES_UPDATED_EVENT, handleOverridesUpdated);

    return () => {
      window.removeEventListener(
        I18N_OVERRIDES_UPDATED_EVENT,
        handleOverridesUpdated
      );
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const pendingVersion = sessionStorage.getItem(I18N_OVERRIDES_PENDING_KEY);
    if (!pendingVersion) {
      return;
    }

    sessionStorage.removeItem(I18N_OVERRIDES_PENDING_KEY);
    router.refresh();
  }, [pathname, router]);

  const needsPassword = Boolean(user && user.hasPassword === false);

  return (
    <AppContext.Provider
      value={{
        user,
        sessionUser,
        isCheckSign,
        isConfigsLoaded,
        unreadNotificationCount,
        isShowSignModal,
        setIsShowSignModal,
        isShowPaymentModal,
        setIsShowPaymentModal,
        configs,
        fetchConfigs,
        refreshUnreadNotificationCount,
        fetchUserCredits,
        fetchUserInfo,
        needsPassword,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
