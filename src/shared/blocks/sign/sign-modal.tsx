'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/core/i18n/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useAppContext } from '@/shared/contexts/app';

import { SignInForm } from './sign-in-form';

export function SignModal({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations('common.sign');
  const { isShowSignModal, setIsShowSignModal } = useAppContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const effectiveCallbackUrl = useMemo(() => {
    if (callbackUrl) return callbackUrl;
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('signInCallbackUrl');
      if (stored) {
        sessionStorage.removeItem('signInCallbackUrl');
        return stored;
      }
    }

    const query = searchParams?.toString();
    if (pathname) {
      return query ? `${pathname}?${query}` : pathname;
    }

    return '/';
  }, [callbackUrl, pathname, searchParams]);

  return (
    <Dialog open={isShowSignModal} onOpenChange={setIsShowSignModal}>
      <DialogContent
        showCloseButton={false}
        className="text-foreground inset-x-0 top-0 left-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden gap-0 rounded-none border-0 p-0 sm:inset-auto sm:top-[50%] sm:left-[50%] sm:h-auto sm:w-full sm:max-w-[425px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:gap-4 sm:rounded-lg sm:border sm:p-6"
      >
        <DialogHeader className="relative shrink-0 border-b px-4 py-3 pr-12 text-left sm:border-b-0 sm:px-0 sm:py-0 sm:pr-10">
          <DialogTitle className="text-foreground">{t('sign_in_title')}</DialogTitle>
          <DialogDescription>{t('sign_in_description')}</DialogDescription>
          <button
            type="button"
            onClick={() => setIsShowSignModal(false)}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground sm:right-0 sm:top-0"
            aria-label={t('cancel_title')}
          >
            <X className="size-4" />
          </button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 [touch-action:pan-y] sm:px-0 sm:pb-0 sm:pt-0 sm:overflow-visible">
          <SignInForm
            callbackUrl={effectiveCallbackUrl}
            className="mx-auto mt-0 pb-4"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
