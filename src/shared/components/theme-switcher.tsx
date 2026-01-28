"use client";

import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { useThemeColor } from "@/shared/hooks/use-theme-color";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

export function ThemeSwitcher({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { currentTheme, changeTheme, themes, theme } = useThemeColor();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a placeholder button during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={cn("relative", className)}
        title="Change theme colors"
        disabled
      >
        <Palette className="h-5 w-5" />
        <span className="sr-only">Change theme colors</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "relative text-foreground border-border hover:text-primary",
            className,
          )}
          title="Change theme colors"
        >
          <Palette className="h-5 w-5" />
          <span className="sr-only">Change theme colors</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Theme Colors</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.name}
            onClick={() => changeTheme(t.name)}
            className="flex flex-col items-start gap-2 py-3 cursor-pointer"
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-5 w-5 rounded-full border-2 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${t.colors.light.primary}, ${t.colors.light.secondary}, ${t.colors.light.accent})`,
                  }}
                />
                <span className="font-medium">{t.label}</span>
              </div>
              {currentTheme === t.name && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t.description}</p>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground text-center">
            Current: <span className="font-medium">{theme?.label}</span>
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
