'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { usePathname } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
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
    <Drawer open={isShowSignModal} onOpenChange={setIsShowSignModal}>
      <DrawerContent className="text-foreground">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-foreground">{t('sign_in_title')}</DrawerTitle>
          <DrawerDescription>{t('sign_in_description')}</DrawerDescription>
        </DrawerHeader>
        <SignInForm callbackUrl={effectiveCallbackUrl} className="mt-8 px-4" />
        <DrawerFooter className="pt-4">
          <DrawerClose asChild>
            <Button variant="outline" className="text-foreground">{t("cancel_title")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
