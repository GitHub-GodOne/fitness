import { getTranslations } from 'next-intl/server';

import { ForgotPasswordForm } from '@/shared/blocks/sign/forgot-password-form';
import { buildSeoTitle, getLocaleAlternates } from '@/shared/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('settings.security.forgot_password');

  return {
    title: buildSeoTitle(t('title')),
    description: t('description'),
    robots: { index: false, follow: false },
    alternates: getLocaleAlternates('/forgot-password', locale),
  };
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return <ForgotPasswordForm callbackUrl={callbackUrl} />;
}
