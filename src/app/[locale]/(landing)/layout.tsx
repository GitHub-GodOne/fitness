import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { getThemeLayout } from '@/core/theme';
import {
  GuestPageAccessGuard,
  LocaleDetector,
  TopBanner,
} from '@/shared/blocks/common';
import { getConfigs } from '@/shared/models/config';
import { parseGuestAccessPaths } from '@/shared/lib/guest-access';
import {
  Footer as FooterType,
  Header as HeaderType,
} from '@/shared/types/blocks/landing';

export default async function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  // load page data
  const [t, configs] = await Promise.all([
    getTranslations('landing'),
    getConfigs(),
  ]);

  // load layout component
  const Layout = await getThemeLayout('landing');

  // header and footer to display
  const header: HeaderType = t.raw('header');
  const footer: FooterType = t.raw('footer');
  const guestPagePopupEnabled = configs.guest_page_popup_enabled === 'true';
  const guestPagePopupPaths = parseGuestAccessPaths(
    configs.guest_page_popup_paths
  );

  return (
    <Layout header={header} footer={footer}>
      <LocaleDetector />
      <GuestPageAccessGuard
        enabled={guestPagePopupEnabled}
        protectedPaths={guestPagePopupPaths}
      >
        {children}
      </GuestPageAccessGuard>
    </Layout>
  );
}
