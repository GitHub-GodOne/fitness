'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

export default function SetPasswordPage() {
  const t = useTranslations('settings.security.set_password');
  const ft = useTranslations('settings.security.fields');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if user already has a password — if so, skip this page
  useEffect(() => {
    const checkPassword = async () => {
      try {
        const res = await fetch('/api/user/has-password', { method: 'POST' });
        const data = await res.json();
        if (data?.data?.hasPassword) {
          window.location.href = callbackUrl;
          return;
        }
      } catch {
        // If check fails, show the form anyway
      }
      setChecking(false);
    };
    checkPassword();
  }, [callbackUrl]);

  const handleSetPassword = async () => {
    if (loading) return;

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
      const res = await fetch('/api/user/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data?.data?.status) {
        toast.success(t('success'));
        window.location.href = callbackUrl;
      } else {
        toast.error(data?.message || 'set password failed');
      }
    } catch {
      toast.error('set password failed');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <Card className="mx-auto w-full md:max-w-md">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">
          <h1>{t('force_title')}</h1>
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          <h2>{t('force_description')}</h2>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new_password">{ft('new_password')}</Label>
            <Input
              id="new_password"
              type="password"
              placeholder={ft('new_password')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm_password">{ft('confirm_password')}</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder={ft('confirm_password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={loading}
            onClick={handleSetPassword}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t('buttons.submit')
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
