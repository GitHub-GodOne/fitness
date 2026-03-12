"use client";

import { useEffect, useState } from "react";
import { Check, Globe, Languages } from "lucide-react";
import { useLocale } from "next-intl";

import { usePathname, useRouter } from "@/core/i18n/navigation";
import { localeNames } from "@/config/locale";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cacheSet } from "@/shared/lib/cache";

export function LocaleSelector({
  type = "icon",
}: {
  type?: "icon" | "button";
}) {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSwitchLanguage = (value: string) => {
    if (value !== currentLocale) {
      // Update localStorage to sync with locale detector
      cacheSet("locale", value);
      router.push(pathname, {
        locale: value,
      });
    }
  };

  // Return a placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors"
        disabled
      >
        <Languages size={18} />
        <span className="sr-only">Select language</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Languages size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.keys(localeNames).map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSwitchLanguage(locale)}
          >
            <span>{localeNames[locale]}</span>
            {locale === currentLocale && (
              <Check size={16} className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
