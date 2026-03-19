import { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { getThemeLayout, resolveActiveTheme } from '@/core/theme';
import {
  GuestPageAccessGuard,
  LocaleDetector,
  TopBanner,
} from '@/shared/blocks/common';
import { getAllConfigs } from '@/shared/models/config';
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
    getAllConfigs(),
  ]);

  const activeTheme = resolveActiveTheme(configs);

  // load layout component
  const Layout = await getThemeLayout('landing', activeTheme);

  // header and footer to display
  const header: HeaderType = t.raw('header');
  const footer: FooterType = t.raw('footer');
  const guestPagePopupEnabled = configs.guest_page_popup_enabled === 'true';
  const guestPagePopupPaths = parseGuestAccessPaths(
    configs.guest_page_popup_paths
  );
  const mobileHeaderNavMode =
    configs.mobile_header_nav_mode === 'tabs' ? 'tabs' : 'accordion';

  return (
    <Layout
      header={header}
      footer={footer}
      mobileHeaderNavMode={mobileHeaderNavMode}
    >
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
