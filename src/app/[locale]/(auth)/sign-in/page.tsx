import { getTranslations } from 'next-intl/server';

import { envConfigs } from '@/config';
import { buildSeoTitle, getLocaleAlternates } from '@/shared/lib/seo';
import { SignIn } from '@/shared/blocks/sign/sign-in';
import { getAllConfigs } from '@/shared/models/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const t = await getTranslations('common');

  return {
    title: buildSeoTitle(t('sign.sign_in_title')),
    robots: { index: true, follow: true },
    alternates: getLocaleAlternates('/sign-in', locale),
  };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  const configs = await getAllConfigs();

  return <SignIn configs={configs} callbackUrl={callbackUrl || '/'} />;
}
