import { getTranslations } from 'next-intl/server';

import { envConfigs } from '@/config';
import { buildSeoTitle, getLocaleAlternates } from '@/shared/lib/seo';
import { SignUp } from '@/shared/blocks/sign/sign-up';
import { getAllConfigs } from '@/shared/models/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const t = await getTranslations('common');

  return {
    title: buildSeoTitle(t('sign.sign_up_title')),
    robots: { index: true, follow: true },
    alternates: getLocaleAlternates('/sign-up', locale),
  };
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  const configs = await getAllConfigs();

  return <SignUp configs={configs} callbackUrl={callbackUrl || '/'} />;
}
