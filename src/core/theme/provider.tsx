'use client';

import { ReactNode, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';

import { envConfigs } from '@/config';
import {
  APPEARANCE_STORAGE_KEY,
  defaultTheme,
  getThemeCssVariables,
  THEME_COLOR_STORAGE_KEY,
} from '@/config/theme/themes';

function ThemeVariableSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const savedTheme =
      localStorage.getItem(THEME_COLOR_STORAGE_KEY) ||
      root.dataset.themeColor ||
      root.dataset.defaultThemeColor ||
      defaultTheme;
    const savedAppearance =
      localStorage.getItem(APPEARANCE_STORAGE_KEY) || resolvedTheme || 'light';
    const isDark = savedAppearance === 'dark';
    const cssVariables = getThemeCssVariables(savedTheme, isDark);

    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.dataset.themeColor = savedTheme;
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    if (typeof document !== 'undefined' && locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={envConfigs.appearance}
      enableSystem
      disableTransitionOnChange
    >
      <ThemeVariableSync />
      {children}
    </NextThemesProvider>
  );
}
