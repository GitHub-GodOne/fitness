'use client';

import { Check, Palette } from 'lucide-react';
import { useThemeColor } from '@/shared/hooks/use-theme-color';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

export function ThemeSwitcherInline() {
  const { currentTheme, changeTheme, themes } = useThemeColor();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground">
          <Palette className="h-4 w-4" />
          <span>Theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="left" align="start" className="w-48">
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.name}
            onClick={() => changeTheme(t.name)}
            className="cursor-pointer"
          >
            <div
              className="h-4 w-4 rounded-full border shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${t.colors.light.primary}, ${t.colors.light.accent})`,
              }}
            />
            <span>{t.label}</span>
            {currentTheme === t.name && (
              <Check className="ml-auto h-3 w-3 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
