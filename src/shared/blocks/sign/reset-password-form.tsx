'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { defaultLocale } from '@/config/locale';
import { Link, useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

function normalizeLocalePath(path: string, locale: string) {
  if (!path.startsWith('/')) {
    return path;
  }

  if (locale !== defaultLocale && !path.startsWith(`/${locale}`)) {
    return `/${locale}${path}`;
  }

  return path;
}

export function ResetPasswordForm() {
  const t = useTranslations('settings.security.reset_password');
  const ft = useTranslations('settings.security.fields');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const error = searchParams.get('error') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const signInHref = useMemo(() => {
    const normalizedCallbackUrl = normalizeLocalePath(callbackUrl, locale);
    return {
      pathname: '/sign-in',
      query: normalizedCallbackUrl ? { callbackUrl: normalizedCallbackUrl } : {},
    };
  }, [callbackUrl, locale]);

  const handleSubmit = async () => {
    if (loading || done) return;

    if (!token) {
      toast.error(t('error.invalid_token'));
      return;
    }
    if (!newPassword) {
      toast.error(t('error.new_password_required'));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t('error.password_too_short'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('error.password_mismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.status) {
        toast.error(data?.message || t('error.failed'));
        return;
      }

      setDone(true);
      toast.success(t('success'));
      router.push(signInHref);
    } catch {
      toast.error(t('error.failed'));
    } finally {
      setLoading(false);
    }
  };

  const isInvalid = !token || error === 'INVALID_TOKEN';

  return (
    <Card className="mx-auto w-full md:max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">{t('title')}</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          {isInvalid ? t('invalid_description') : t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isInvalid ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {t('error.invalid_token')}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="reset-password-new">{ft('new_password')}</Label>
              <Input
                id="reset-password-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reset-password-confirm">{ft('confirm_password')}</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={loading || done} onClick={handleSubmit}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t('buttons.submit')
              )}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-center border-t py-4">
          <Link href={signInHref} className="text-xs text-muted-foreground underline">
            {t('buttons.back_to_sign_in')}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
