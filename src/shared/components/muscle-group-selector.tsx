"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { cn } from "@/shared/lib/utils";

// Muscle group configuration
const MUSCLE_GROUPS = [
  { key: "chest", icon: "💪" },
  { key: "arms", icon: "🦾" },
  { key: "legs", icon: "🦵" },
  { key: "core", icon: "🎯" },
  { key: "back", icon: "🔙" },
  { key: "shoulders", icon: "🏋️" },
  { key: "full_body", icon: "🏃" },
  { key: "cardio", icon: "❤️" },
] as const;

type MuscleGroupKey = (typeof MUSCLE_GROUPS)[number]["key"];

interface MuscleGroupSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Translation namespace for muscle group labels */
  translationNamespace?: string;
}

interface MuscleGroupGridProps {
  selectedValue: string;
  onSelect: (key: string) => void;
  t: (key: string) => string;
}

// Extracted grid component for reuse
function MuscleGroupGrid({ selectedValue, onSelect, t }: MuscleGroupGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {MUSCLE_GROUPS.map(({ key, icon }) => {
        const isSelected = selectedValue === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-3 transition-all",
              "hover:border-primary hover:bg-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground",
            )}
          >
            {isSelected && (
              <Check className="absolute top-1.5 right-1.5 h-4 w-4 text-primary" />
            )}
            <span className="text-2xl" role="img" aria-hidden="true">
              {icon}
            </span>
            <span className="text-xs font-medium sm:text-sm text-center leading-tight">
              {t(`form.target_muscle_groups.${key}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MuscleGroupSelector({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  translationNamespace = "ai.video.generator",
}: MuscleGroupSelectorProps) {
  const t = useTranslations(translationNamespace);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Get display value - either translated label or custom input
  const displayValue = useMemo(() => {
    if (!value) return "";

    // Check if value is a predefined muscle group
    const predefined = MUSCLE_GROUPS.find((g) => g.key === value);
    if (predefined) {
      return t(`form.target_muscle_groups.${predefined.key}`);
    }

    // Return custom value as-is
    return value;
  }, [value, t]);

  // Handle selection from grid
  const handleSelect = useCallback(
    (key: string) => {
      onChange(key);
      setInputValue("");
      setOpen(false);
    },
    [onChange],
  );

  // Handle custom input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange(newValue);
    },
    [onChange],
  );

  // Handle clear
  const handleClear = useCallback(() => {
    onChange("");
    setInputValue("");
  }, [onChange]);

  // Handle open dialog/drawer
  const handleOpenSelector = useCallback(() => {
    if (!disabled) {
      setOpen(true);
    }
  }, [disabled]);

  // Selector content (shared between Dialog and Drawer)
  const selectorContent = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("form.user_feeling_hint")}
      </p>
      <MuscleGroupGrid selectedValue={value} onSelect={handleSelect} t={t} />
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {/* Input with selector button */}
      <div className="relative flex items-center">
        <Input
          value={inputValue || displayValue}
          onChange={handleInputChange}
          placeholder={placeholder || t("form.user_feeling_placeholder")}
          disabled={disabled}
          className="pr-16"
        />

        {/* Clear button */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Selector trigger button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOpenSelector}
          disabled={disabled}
          className="absolute right-1 h-7 w-7 p-0"
          aria-label={t("form.user_feeling")}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop: Dialog */}
      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("form.user_feeling")}</DialogTitle>
            </DialogHeader>
            {selectorContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("cancel")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        /* Mobile: Drawer */
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("form.user_feeling")}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">{selectorContent}</div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">{t("cancel")}</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

// Export muscle group keys for external use
export { MUSCLE_GROUPS, type MuscleGroupKey };
