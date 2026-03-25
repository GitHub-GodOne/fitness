import { getTranslations } from 'next-intl/server';

import { ResetPasswordForm } from '@/shared/blocks/sign/reset-password-form';
import { buildSeoTitle, getLocaleAlternates } from '@/shared/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('settings.security.reset_password');

  return {
    title: buildSeoTitle(t('title')),
    description: t('description'),
    robots: { index: false, follow: false },
    alternates: getLocaleAlternates('/reset-password', locale),
  };
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
