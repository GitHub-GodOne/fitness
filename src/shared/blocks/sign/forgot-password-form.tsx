'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { defaultLocale } from '@/config/locale';
import { Link } from '@/core/i18n/navigation';
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

export function ForgotPasswordForm({
  initialEmail = '',
  callbackUrl,
  compact = false,
}: {
  initialEmail?: string;
  callbackUrl?: string;
  compact?: boolean;
}) {
  const t = useTranslations('settings.security.forgot_password');
  const ft = useTranslations('settings.security.fields');
  const signT = useTranslations('common.sign');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const finalCallbackUrl = useMemo(() => {
    const raw = callbackUrl || searchParams.get('callbackUrl') || '/';
    return normalizeLocalePath(raw, locale);
  }, [callbackUrl, searchParams, locale]);

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const baseResetPath = normalizeLocalePath('/reset-password', locale);
    const params = new URLSearchParams();
    if (finalCallbackUrl) {
      params.set('callbackUrl', finalCallbackUrl);
    }

    return `${window.location.origin}${baseResetPath}${params.toString() ? `?${params.toString()}` : ''}`;
  }, [finalCallbackUrl, locale]);

  const handleSubmit = async () => {
    if (loading) return;

    if (!email) {
      toast.error(t('error.email_required'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || t('error.failed'));
        return;
      }

      setSubmitted(true);
      toast.success(t('success'));
    } catch {
      toast.error(t('error.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={compact ? 'max-w-md' : 'mx-auto w-full md:max-w-md'}>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">{t('title')}</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          {submitted ? t('sent_description') : t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="forgot-password-email">{ft('email')}</Label>
            <Input
              id="forgot-password-email"
              type="email"
              placeholder={signT('email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || submitted}
            />
          </div>
          <Button
            className="w-full"
            disabled={loading || submitted}
            onClick={handleSubmit}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t('buttons.submit')
            )}
          </Button>
        </div>
      </CardContent>
      {!compact ? (
        <CardFooter>
          <div className="flex w-full justify-center border-t py-4">
            <Link
              href={{
                pathname: '/sign-in',
                query: finalCallbackUrl ? { callbackUrl: finalCallbackUrl } : {},
              }}
              className="text-xs text-muted-foreground underline"
            >
              {t('buttons.back_to_sign_in')}
            </Link>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
