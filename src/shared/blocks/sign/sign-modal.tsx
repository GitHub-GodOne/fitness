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
import { useMediaQuery } from '@/shared/hooks/use-media-query';

import { SignInForm } from './sign-in-form';

export function SignModal({ callbackUrl }: { callbackUrl?: string }) {
  const t = useTranslations('common.sign');
  const { isShowSignModal, setIsShowSignModal } = useAppContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isDesktop = useMediaQuery('(min-width: 768px)');

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

  if (isDesktop) {
    return (
      <Dialog open={isShowSignModal} onOpenChange={setIsShowSignModal}>
        <DialogContent className="text-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('sign_in_title')}</DialogTitle>
            <DialogDescription>{t('sign_in_description')}</DialogDescription>
          </DialogHeader>
          <SignInForm callbackUrl={effectiveCallbackUrl} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isShowSignModal} onOpenChange={setIsShowSignModal}>
      <DialogContent
        showCloseButton={false}
        className="text-foreground inset-x-0 top-0 left-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden gap-0 rounded-none border-0 p-0"
      >
        <DialogHeader className="relative shrink-0 border-b px-4 py-3 pr-12 text-left">
          <DialogTitle className="text-foreground">{t('sign_in_title')}</DialogTitle>
          <DialogDescription>{t('sign_in_description')}</DialogDescription>
          <button
            type="button"
            onClick={() => setIsShowSignModal(false)}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={t('cancel_title')}
          >
            <X className="size-4" />
          </button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-none px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 [touch-action:pan-y]">
          <SignInForm
            callbackUrl={effectiveCallbackUrl}
            className="mx-auto mt-0 pb-4"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
