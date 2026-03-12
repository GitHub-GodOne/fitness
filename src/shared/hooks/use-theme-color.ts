'use client';

import { useEffect, useState } from 'react';
import {
  APPEARANCE_STORAGE_KEY,
  defaultTheme,
  getThemeCssVariables,
  themes,
  THEME_COLOR_STORAGE_KEY,
} from '@/config/theme/themes';

// Get initial theme from localStorage (client-side only)
const getInitialTheme = () => {
  if (typeof window === 'undefined') return defaultTheme;
  const hydratedTheme = document.documentElement.dataset.themeColor;
  if (hydratedTheme && themes.find((t) => t.name === hydratedTheme)) {
    return hydratedTheme;
  }
  const savedTheme = localStorage.getItem(THEME_COLOR_STORAGE_KEY);
  if (savedTheme && themes.find((t) => t.name === savedTheme)) {
    return savedTheme;
  }
  return defaultTheme;
};

export function useThemeColor() {
  const [currentTheme, setCurrentTheme] = useState<string>(getInitialTheme);
  const [isDark, setIsDark] = useState(false);

  // Initialize system preference
  useEffect(() => {
    // Check dark mode
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const storedAppearance = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    const initialIsDark =
      storedAppearance === 'dark' ||
      (storedAppearance !== 'light' &&
        (darkModeQuery.matches || document.documentElement.classList.contains('dark')));
    setIsDark(initialIsDark);

    // Listen for dark mode changes
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      const nextAppearance = localStorage.getItem(APPEARANCE_STORAGE_KEY);
      if (!nextAppearance || nextAppearance === 'system') {
        setIsDark(e.matches);
      }
    };

    // Listen for class changes on html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    darkModeQuery.addEventListener('change', handleDarkModeChange);

    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
      observer.disconnect();
    };
  }, []);

  // Apply theme colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const cssVariables = getThemeCssVariables(currentTheme, isDark);
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.dataset.themeColor = currentTheme;

    // Save to localStorage
    localStorage.setItem(THEME_COLOR_STORAGE_KEY, currentTheme);
  }, [currentTheme, isDark]);

  const changeTheme = (themeName: string) => {
    if (themes.find((t) => t.name === themeName)) {
      setCurrentTheme(themeName);
    }
  };

  const theme = themes.find((t) => t.name === currentTheme);

  return {
    currentTheme,
    changeTheme,
    themes,
    theme,
    isDark,
  };
}
