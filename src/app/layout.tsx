import "@/config/style/global.css";

import { JetBrains_Mono, Merriweather, Noto_Sans_Mono } from "next/font/google";
import { getLocale, setRequestLocale } from "next-intl/server";
import NextTopLoader from "nextjs-toploader";

import { envConfigs } from "@/config";
import { locales } from "@/config/locale";
import {
  APPEARANCE_STORAGE_KEY,
  defaultTheme as defaultThemeColor,
  getThemeCssVariables,
  THEME_COLOR_STORAGE_KEY,
  themes,
} from "@/config/theme/themes";
import { UtmCapture } from "@/shared/blocks/common/utm-capture";
import { ChunkErrorHandler } from "@/shared/components/chunk-error-handler";
import { getAllConfigs } from "@/shared/models/config";
import { getAdsService } from "@/shared/services/ads";
import { getAffiliateService } from "@/shared/services/affiliate";
import { getAnalyticsService } from "@/shared/services/analytics";
import { getCustomerService } from "@/shared/services/customer_service";

const notoSansMono = Noto_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: true,
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  setRequestLocale(locale);

  const isProduction = process.env.NODE_ENV === "production";
  const isDebug = process.env.NEXT_PUBLIC_DEBUG === "true";

  // app url
  const appUrl = envConfigs.app_url || "";

  const configs = await getAllConfigs();
  const configuredDefaultTheme =
    typeof configs.default_theme_color === "string" &&
    themes.find((theme) => theme.name === configs.default_theme_color)
      ? configs.default_theme_color
      : defaultThemeColor;

  // ads components
  let adsMetaTags = null;
  let adsHeadScripts = null;
  let adsBodyScripts = null;

  // analytics components
  let analyticsMetaTags = null;
  let analyticsHeadScripts = null;
  let analyticsBodyScripts = null;

  // affiliate components
  let affiliateMetaTags = null;
  let affiliateHeadScripts = null;
  let affiliateBodyScripts = null;

  // customer service components
  let customerServiceMetaTags = null;
  let customerServiceHeadScripts = null;
  let customerServiceBodyScripts = null;

  const defaultLightThemeVars = getThemeCssVariables(configuredDefaultTheme, false);
  const themeVarKeys = Object.keys(defaultLightThemeVars);
  const themeColorBootstrap = `
    (() => {
      try {
        const themeStorageKey = ${JSON.stringify(THEME_COLOR_STORAGE_KEY)};
        const appearanceStorageKey = ${JSON.stringify(APPEARANCE_STORAGE_KEY)};
        const defaultTheme = ${JSON.stringify(configuredDefaultTheme)};
        const themes = ${JSON.stringify(themes)};
        const root = document.documentElement;
        const savedTheme = localStorage.getItem(themeStorageKey) || defaultTheme;
        const appearance = localStorage.getItem(appearanceStorageKey);
        const isDark =
          appearance === 'dark' ||
          (appearance !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        const selectedTheme =
          themes.find((theme) => theme.name === savedTheme) ||
          themes.find((theme) => theme.name === defaultTheme) ||
          themes[0];
        if (!selectedTheme) return;
        const colors = isDark ? selectedTheme.colors.dark : selectedTheme.colors.light;
        const vars = {
          '--primary': colors.primary,
          '--secondary': colors.secondary,
          '--accent': colors.accent,
          '--background': colors.background,
          '--foreground': colors.foreground,
          '--muted': colors.muted,
          '--border': colors.border,
          '--input': colors.border,
          '--ring': colors.primary,
          '--primary-foreground': colors.background,
          '--secondary-foreground': colors.background,
          '--accent-foreground': colors.foreground,
          '--muted-foreground': colors.foreground,
          '--card': colors.background,
          '--card-foreground': colors.foreground,
          '--popover': colors.background,
          '--popover-foreground': colors.foreground,
          '--chart-1': colors.primary,
          '--chart-2': colors.secondary,
          '--chart-3': colors.accent,
        };
        Object.entries(vars).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
        root.dataset.themeColor = selectedTheme.name;
      } catch (error) {}
    })();
  `;

  if (isProduction || isDebug) {
    const [adsService, analyticsService, affiliateService, customerService] =
      await Promise.all([
        getAdsService(configs),
        getAnalyticsService(configs),
        getAffiliateService(configs),
        getCustomerService(configs),
      ]);

    // get ads components
    adsMetaTags = adsService.getMetaTags();
    adsHeadScripts = adsService.getHeadScripts();
    adsBodyScripts = adsService.getBodyScripts();

    // get analytics components
    analyticsMetaTags = analyticsService.getMetaTags();
    analyticsHeadScripts = analyticsService.getHeadScripts();
    analyticsBodyScripts = analyticsService.getBodyScripts();

    // get affiliate components
    affiliateMetaTags = affiliateService.getMetaTags();
    affiliateHeadScripts = affiliateService.getHeadScripts();
    affiliateBodyScripts = affiliateService.getBodyScripts();

    // get customer service components
    customerServiceMetaTags = customerService.getMetaTags();
    customerServiceHeadScripts = customerService.getHeadScripts();
    customerServiceBodyScripts = customerService.getBodyScripts();
  }

  return (
    <html
      lang={locale}
      className={`${notoSansMono.variable} ${merriweather.variable} ${jetbrainsMono.variable}`}
      data-theme-color={configuredDefaultTheme}
      data-default-theme-color={configuredDefaultTheme}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href={envConfigs.app_favicon} />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`:root{${themeVarKeys
          .map((key) => `${key}:${defaultLightThemeVars[key as keyof typeof defaultLightThemeVars]};`)
          .join('')}}`}</style>
        <script dangerouslySetInnerHTML={{ __html: themeColorBootstrap }} />

        {/* inject locales */}
        {locales ? (
          <>
            {locales.map((loc) => (
              <link
                key={loc}
                rel="alternate"
                hrefLang={loc}
                href={`${appUrl}${loc === "en" ? "" : `/${loc}`}`}
              />
            ))}
          </>
        ) : null}

        {/* inject ads meta tags */}
        {adsMetaTags}
        {/* inject ads head scripts */}
        {adsHeadScripts}

        {/* inject analytics meta tags */}
        {analyticsMetaTags}
        {/* inject analytics head scripts */}
        {analyticsHeadScripts}

        {/* inject affiliate meta tags */}
        {affiliateMetaTags}
        {/* inject affiliate head scripts */}
        {affiliateHeadScripts}

        {/* inject customer service meta tags */}
        {customerServiceMetaTags}
        {/* inject customer service head scripts */}
        {customerServiceHeadScripts}
      </head>
      <body suppressHydrationWarning className="overflow-x-hidden">
        <NextTopLoader
          color="#6466F1"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={true}
          easing="ease"
          speed={200}
        />

        <ChunkErrorHandler />
        <UtmCapture />

        {children}

        {/* inject ads body scripts */}
        {adsBodyScripts}

        {/* inject analytics body scripts */}
        {analyticsBodyScripts}

        {/* inject affiliate body scripts */}
        {affiliateBodyScripts}

        {/* inject customer service body scripts */}
        {customerServiceBodyScripts}
      </body>
    </html>
  );
}
