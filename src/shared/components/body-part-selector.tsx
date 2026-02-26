"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/shared/lib/utils";

import type { Muscle, IMuscleStats } from "react-body-highlighter";

const Model = dynamic(() => import("react-body-highlighter"), { ssr: false });

const BODY_PARTS = [
  "neck",
  "shoulders",
  "chest",
  "arms",
  "back",
  "waist",
  "glutes",
  "legs",
] as const;

export type BodyPartKey = (typeof BODY_PARTS)[number];

// Mapping: body part key → package muscle slugs
const BODY_PART_TO_MUSCLES: Record<BodyPartKey, Muscle[]> = {
  neck: ["neck", "head"],
  shoulders: ["front-deltoids", "back-deltoids", "trapezius"],
  chest: ["chest"],
  arms: ["biceps", "triceps", "forearm"],
  back: ["upper-back", "lower-back"],
  waist: ["abs", "obliques"],
  glutes: ["gluteal"],
  legs: ["quadriceps", "hamstring", "calves", "adductor", "abductors"],
};

// Reverse mapping: muscle slug → body part key
const MUSCLE_TO_BODY_PART: Record<string, BodyPartKey> = {};
for (const [bodyPart, muscles] of Object.entries(BODY_PART_TO_MUSCLES)) {
  for (const muscle of muscles) {
    MUSCLE_TO_BODY_PART[muscle] = bodyPart as BodyPartKey;
  }
}

interface BodyPartSelectorProps {
  selected: string[];
  onChange: (parts: string[]) => void;
  disabled?: boolean;
}

export function BodyPartSelector({
  selected,
  onChange,
  disabled,
}: BodyPartSelectorProps) {
  const t = useTranslations("ai.video.generator.wizard.body_parts");

  const toggle = useCallback(
    (part: string) => {
      if (disabled) return;
      if (selected.includes(part)) {
        onChange(selected.filter((p) => p !== part));
      } else {
        onChange([...selected, part]);
      }
    },
    [disabled, selected, onChange],
  );

  const handleMuscleClick = useCallback(
    (data: IMuscleStats) => {
      const bodyPart = MUSCLE_TO_BODY_PART[data.muscle];
      if (bodyPart) toggle(bodyPart);
    },
    [toggle],
  );

  const modelData = useMemo(() => {
    if (selected.length === 0) return [];
    const muscles: Muscle[] = [];
    for (const part of selected) {
      const partMuscles = BODY_PART_TO_MUSCLES[part as BodyPartKey];
      if (partMuscles) muscles.push(...partMuscles);
    }
    return [{ name: "Selected", muscles, frequency: 1 }];
  }, [selected]);

  return (
    <div className="flex flex-col items-center gap-4">
      <style>{`
        .body-highlighter-wrapper svg polygon,
        .body-highlighter-wrapper svg path {
          transition: fill 0.2s ease, opacity 0.2s ease;
          cursor: pointer;
        }
        .body-highlighter-wrapper svg polygon:hover,
        .body-highlighter-wrapper svg path:hover {
          opacity: 0.8;
          filter: brightness(1.15);
        }
      `}</style>

      {/* Front + Back side by side */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground font-medium">{t("front_view")}</span>
          <div className="body-highlighter-wrapper w-full">
            <Model
              type="anterior"
              data={modelData}
              bodyColor="#94a3b8"
              highlightedColors={["#f97316"]}
              onClick={handleMuscleClick}
              style={{ width: "100%", padding: "0" }}
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground font-medium">{t("back_view")}</span>
          <div className="body-highlighter-wrapper w-full">
            <Model
              type="posterior"
              data={modelData}
              bodyColor="#94a3b8"
              highlightedColors={["#f97316"]}
              onClick={handleMuscleClick}
              style={{ width: "100%", padding: "0" }}
            />
          </div>
        </div>
      </div>

      {/* Selected count */}
      {selected.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("selected_count", { count: selected.length })}
        </p>
      )}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selected.map((part) => (
            <button
              key={part}
              type="button"
              onClick={() => toggle(part)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                "bg-primary/10 text-primary border border-primary/20",
                "hover:bg-primary/20 transition-colors",
              )}
            >
              {t(part as BodyPartKey)}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
