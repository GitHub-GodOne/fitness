'use client';

import { useEffect, useState } from 'react';
import { themes, defaultTheme, type ThemeColors } from '@/config/theme/themes';

const THEME_STORAGE_KEY = 'app-theme-color';

// Get initial theme from localStorage (client-side only)
const getInitialTheme = () => {
  if (typeof window === 'undefined') return defaultTheme;
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
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
    setIsDark(darkModeQuery.matches || document.documentElement.classList.contains('dark'));

    // Listen for dark mode changes
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
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
    const theme = themes.find((t) => t.name === currentTheme);
    if (!theme) return;

    const colors = isDark ? theme.colors.dark : theme.colors.light;
    const root = document.documentElement;

    // Apply theme colors
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    root.style.setProperty('--muted', colors.muted);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--input', colors.border);
    root.style.setProperty('--ring', colors.primary);

    // Update related colors
    root.style.setProperty('--primary-foreground', colors.background);
    root.style.setProperty('--secondary-foreground', colors.background);
    root.style.setProperty('--accent-foreground', colors.foreground);
    root.style.setProperty('--muted-foreground', colors.foreground);
    root.style.setProperty('--card', colors.background);
    root.style.setProperty('--card-foreground', colors.foreground);
    root.style.setProperty('--popover', colors.background);
    root.style.setProperty('--popover-foreground', colors.foreground);

    // Update charts
    root.style.setProperty('--chart-1', colors.primary);
    root.style.setProperty('--chart-2', colors.secondary);
    root.style.setProperty('--chart-3', colors.accent);

    // Save to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
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
