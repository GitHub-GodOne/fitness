'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

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

export function PasswordManager() {
  const t = useTranslations('settings.security');
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/user/has-password', { method: 'POST' });
        const data = await res.json();
        setHasPassword(!!data?.data?.hasPassword);
      } catch {
        setHasPassword(false);
      }
    };
    check();
  }, []);

  const validate = () => {
    if (hasPassword && !currentPassword) {
      toast.error(t('change_password.error.current_password_required'));
      return false;
    }
    if (!newPassword) {
      const key = hasPassword
        ? 'change_password.error.new_password_required'
        : 'set_password.error.new_password_required';
      toast.error(t(key));
      return false;
    }
    if (newPassword.length < 8) {
      const key = hasPassword
        ? 'change_password.error.password_too_short'
        : 'set_password.error.password_too_short';
      toast.error(t(key));
      return false;
    }
    if (newPassword !== confirmPassword) {
      const key = hasPassword
        ? 'change_password.error.password_mismatch'
        : 'set_password.error.password_mismatch';
      toast.error(t(key));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (loading || !validate()) return;

    setLoading(true);
    try {
      const url = hasPassword
        ? '/api/user/change-password'
        : '/api/user/set-password';
      const body = hasPassword
        ? { currentPassword, newPassword }
        : { newPassword };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data?.data?.status) {
        const msg = hasPassword
          ? t('change_password.success')
          : t('set_password.success');
        toast.success(msg);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (!hasPassword) setHasPassword(true);
      } else {
        toast.error(data?.message || 'failed');
      }
    } catch {
      toast.error('failed');
    } finally {
      setLoading(false);
    }
  };

  if (hasPassword === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  const title = hasPassword
    ? t('change_password.title')
    : t('set_password.title');
  const description = hasPassword
    ? t('change_password.description')
    : t('set_password.description');
  const submitText = hasPassword
    ? t('change_password.buttons.submit')
    : t('set_password.buttons.submit');

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {hasPassword && (
            <div className="grid gap-2">
              <Label htmlFor="current_password">
                {t('fields.current_password')}
              </Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="new_password">{t('fields.new_password')}</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm_password">
              {t('fields.confirm_password')}
            </Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={loading} onClick={handleSubmit}>
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              submitText
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
