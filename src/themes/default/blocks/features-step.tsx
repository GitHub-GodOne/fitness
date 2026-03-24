"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, ScrollText, Sparkles } from "lucide-react";

import { useRequireAuth } from "@/shared/hooks/use-require-auth";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";
import { HomeCtaButton } from "./home-cta-button";

type ButtonVariant =
  | "default"
  | "link"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost";

interface ButtonWithIcon {
  title: string;
  url: string;
  target?: string;
  variant?: string;
  icon?: string;
}

// Step data with biblical icons
const stepIcons = [
  {
    icon: ScrollText,
    color: "from-amber-400 to-orange-500",
    glowColor: "shadow-orange-500/50",
  },
  {
    icon: Gift,
    color: "from-blue-400 to-indigo-500",
    glowColor: "shadow-indigo-500/50",
  },
  {
    icon: Sparkles,
    color: "from-amber-300 to-yellow-500",
    glowColor: "shadow-yellow-500/50",
  },
];

export function FeaturesStep({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const { navigateWithAuth } = useRequireAuth({
    callbackUrl: "/ai-video-generator",
  });

  // Track which step is currently active (cycles automatically)
  const [activeStep, setActiveStep] = useState(1);

  // Auto-cycle through steps every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % (section.items?.length || 3));
    }, 2000);

    return () => clearInterval(interval);
  }, [section.items?.length]);

  return (
    <section
      id={section.id}
      className={cn(
        "relative overflow-hidden py-16 sm:py-20 md:py-28",
        section.className,
        className,
      )}
    >
      {/* Background gradient - sacred biblical feeling */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-muted/20" />

      {/* Animated light rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-primary/15 to-transparent"
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-amber-400/10 to-transparent"
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      <div className="relative z-10 container px-4 sm:px-6">
        {/* Header */}
        <motion.div
          className="mx-auto max-w-3xl text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {section.label && (
            <motion.span
              className="inline-block text-primary text-sm sm:text-base font-medium tracking-wide uppercase"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              {section.label}
            </motion.span>
          )}
          <motion.h2
            className="text-foreground mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {section.title}
          </motion.h2>
          {section.description && (
            <motion.p
              className="text-muted-foreground mt-3 sm:mt-4 text-sm sm:text-base md:text-lg max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {section.description}
            </motion.p>
          )}
        </motion.div>

        {/* Steps - Horizontal Flow */}
        <div className="relative">
          {/* Steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-4">
            {section.items?.map((item, idx) => {
              const stepData = stepIcons[idx] || stepIcons[0];
              const IconComponent = stepData.icon;

              return (
                <motion.div
                  key={idx}
                  className="relative flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: 0.2 + idx * 0.15,
                    duration: 0.6,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* Icon container with sacred glow effect */}
                  <motion.div
                    className={cn(
                      "relative mb-4 sm:mb-6",
                      "flex items-center justify-center",
                      "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24",
                      "rounded-full",
                      "bg-gradient-to-br",
                      stepData.color,
                      "shadow-lg",
                      stepData.glowColor,
                      activeStep === idx && "ring-4 ring-white/50 shadow-2xl",
                    )}
                    animate={{
                      scale: activeStep === idx ? 1.2 : 1,
                      boxShadow:
                        activeStep === idx
                          ? "0 0 60px rgba(234, 179, 8, 0.6)"
                          : "0 0 20px rgba(0, 0, 0, 0.1)",
                    }}
                    transition={{
                      duration: 0.3,
                      ease: "easeOut",
                    }}
                    whileHover={{
                      scale: 1.1,
                      boxShadow: "0 0 40px rgba(234, 179, 8, 0.4)",
                    }}
                  >
                    {/* Pulsing glow ring */}
                    <motion.div
                      className={cn(
                        "absolute inset-0 rounded-full",
                        "bg-gradient-to-br",
                        stepData.color,
                        "opacity-30",
                      )}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.1, 0.3],
                      }}
                      transition={{
                        duration: 2 + idx * 0.3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* Inner icon */}
                    <IconComponent className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white" />

                    {/* Step number badge */}
                    <motion.div
                      className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-background text-primary text-xs sm:text-sm font-bold flex items-center justify-center border-2 border-primary/20 shadow-md"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + idx * 0.2, type: "spring" }}
                    >
                      {idx + 1}
                    </motion.div>
                  </motion.div>

                  {/* Content */}
                  <motion.div
                    className="relative z-10 max-w-xs"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + idx * 0.15 }}
                  >
                    <h3 className="text-foreground text-base sm:text-lg md:text-xl font-semibold mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {item.description}
                    </p>
                  </motion.div>

                  {/* Arrow for mobile - between steps */}
                  {idx < (section.items?.length || 0) - 1 && (
                    <motion.div
                      className="md:hidden mt-4 flex justify-center"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + idx * 0.2 }}
                    >
                      <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <svg
                          className="w-6 h-6 text-primary/50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </motion.div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA Buttons */}
        {section.buttons && section.buttons.length > 0 && (
          <motion.div
            className="mt-12 sm:mt-16 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {section.buttons.map((button, index) => {
              const btn = button as ButtonWithIcon;
              const safeVariant: ButtonVariant =
                btn.variant &&
                [
                  "default",
                  "link",
                  "destructive",
                  "outline",
                  "secondary",
                  "ghost",
                ].includes(btn.variant)
                  ? (btn.variant as ButtonVariant)
                  : "default";
              return (
                <HomeCtaButton
                  key={index}
                  title={btn.title}
                  sectionIcon="featuresStep"
                  onClick={() => navigateWithAuth(btn.url)}
                  className={cn(
                    safeVariant === "default" &&
                      "shadow-lg shadow-primary/25 hover:shadow-primary/40",
                  )}
                />
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}
