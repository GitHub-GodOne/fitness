import { getTranslations } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { ResetPasswordForm } from '@/shared/blocks/sign/reset-password-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('settings.security.reset_password');

  return {
    title: `${t('title')} - ${envConfigs.app_name}`,
    description: t('description'),
    robots: { index: false, follow: false },
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/reset-password`
          : `${envConfigs.app_url}/reset-password`,
    },
  };
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
