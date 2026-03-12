"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { SmartIcon } from "@/shared/blocks/common";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

interface VisionItem {
  title: string;
  subtitle?: string;
  description?: string;
  symbols?: string[];
  symbol_labels?: string[];
  color_theme?: string;
}

const colorThemes: Record<
  string,
  {
    gradient: string;
    glow: string;
    iconBg: string;
    tabActive: string;
    progressBar: string;
  }
> = {
  amber: {
    gradient: "from-amber-500/10 via-orange-400/5 to-amber-600/10",
    glow: "bg-amber-400/20",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    tabActive: "text-amber-600 dark:text-amber-400",
    progressBar: "bg-amber-500",
  },
  blue: {
    gradient: "from-blue-500/10 via-indigo-400/5 to-blue-600/10",
    glow: "bg-blue-400/20",
    iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    tabActive: "text-blue-600 dark:text-blue-400",
    progressBar: "bg-blue-500",
  },
  gold: {
    gradient: "from-yellow-500/10 via-amber-400/5 to-yellow-600/10",
    glow: "bg-yellow-400/20",
    iconBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    tabActive: "text-yellow-600 dark:text-yellow-400",
    progressBar: "bg-yellow-500",
  },
};

const AUTO_CYCLE_MS = 4000;
const RESUME_DELAY_MS = 8000;

export function VisionScenes({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const items = (section.items || []) as unknown as VisionItem[];
  const [activeTab, setActiveTab] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResume = useCallback(() => {
    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current);
      resumeTimer.current = null;
    }
  }, []);

  const scheduleResume = useCallback(() => {
    clearResume();
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_DELAY_MS);
  }, [clearResume]);

  // Auto-cycle
  useEffect(() => {
    if (paused || items.length === 0) return;
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % items.length);
    }, AUTO_CYCLE_MS);
    return () => clearInterval(interval);
  }, [paused, items.length]);

  useEffect(() => () => clearResume(), [clearResume]);

  const handleTabClick = (idx: number) => {
    setActiveTab(idx);
    setPaused(true);
    scheduleResume();
  };

  const handleContentEnter = () => {
    setPaused(true);
    clearResume();
  };

  const handleContentLeave = () => {
    scheduleResume();
  };

  const active = items[activeTab];
  const theme = colorThemes[active?.color_theme || "amber"] || colorThemes.amber;

  return (
    <section
      id={section.id}
      className={cn(
        "relative overflow-hidden py-16 sm:py-20 md:py-28",
        section.className,
        className,
      )}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-muted/20" />

      {/* Animated light rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-amber-400/10 to-transparent"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      <div className="relative z-10 container px-4 sm:px-6">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-3xl text-center mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {section.label && (
            <span className="inline-block text-primary text-sm sm:text-base font-medium tracking-wide uppercase">
              {section.label}
            </span>
          )}
          <h2 className="text-foreground mt-3 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold">
            {section.title}
          </h2>
          {section.description && (
            <p className="text-muted-foreground mt-3 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              {section.description}
            </p>
          )}
        </motion.div>

        {/* Tab bar */}
        <div className="flex justify-center gap-2 sm:gap-4 mb-8 sm:mb-10">
          {items.map((item, idx) => {
            const t = colorThemes[item.color_theme || "amber"] || colorThemes.amber;
            const isActive = idx === activeTab;
            return (
              <button
                key={idx}
                onClick={() => handleTabClick(idx)}
                className={cn(
                  "relative px-4 py-2 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-colors",
                  isActive
                    ? cn(t.tabActive, "bg-muted")
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.title}
                {/* Progress bar */}
                {isActive && !paused && (
                  <motion.div
                    className={cn("absolute bottom-0 left-0 h-0.5 rounded-full", t.progressBar)}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: AUTO_CYCLE_MS / 1000, ease: "linear" }}
                    key={`progress-${activeTab}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div
          onMouseEnter={handleContentEnter}
          onMouseLeave={handleContentLeave}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center"
            >
              {/* Left: decorative gradient panel with floating icons */}
              <div
                className={cn(
                  "relative rounded-2xl p-8 sm:p-12 min-h-[220px] sm:min-h-[280px] flex items-center justify-center overflow-hidden",
                  "bg-gradient-to-br",
                  theme.gradient,
                  "border border-border/50",
                )}
              >
                {/* Glow */}
                <motion.div
                  className={cn("absolute w-40 h-40 rounded-full blur-3xl", theme.glow)}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Floating icons */}
                <div className="relative z-10 grid grid-cols-2 gap-6">
                  {(active?.symbols || []).map((sym, i) => (
                    <motion.div
                      key={`${activeTab}-${i}`}
                      className={cn(
                        "flex flex-col items-center gap-2",
                      )}
                      animate={{ y: [0, -6, 0] }}
                      transition={{
                        duration: 3 + i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.3,
                      }}
                    >
                      <div className={cn("rounded-xl p-3 sm:p-4", theme.iconBg)}>
                        <SmartIcon name={sym} size={28} />
                      </div>
                      {active?.symbol_labels?.[i] && (
                        <span className="text-xs text-muted-foreground text-center">
                          {active.symbol_labels[i]}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: text content */}
              <div className="flex flex-col gap-4">
                <h3 className="text-foreground text-xl sm:text-2xl md:text-3xl font-semibold">
                  {active?.title}
                </h3>
                {active?.subtitle && (
                  <p className={cn("text-lg sm:text-xl font-medium italic", theme.tabActive)}>
                    &ldquo;{active.subtitle}&rdquo;
                  </p>
                )}
                {active?.description && (
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    {active.description}
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
