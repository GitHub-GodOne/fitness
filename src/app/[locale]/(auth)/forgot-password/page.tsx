import { getTranslations } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { ForgotPasswordForm } from '@/shared/blocks/sign/forgot-password-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('settings.security.forgot_password');

  return {
    title: `${t('title')} - ${envConfigs.app_name}`,
    description: t('description'),
    robots: { index: false, follow: false },
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/forgot-password`
          : `${envConfigs.app_url}/forgot-password`,
    },
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
