"use client";

import { Link } from "@/core/i18n/navigation";
import { SmartIcon } from "@/shared/blocks/common/smart-icon";
import { Button } from "@/shared/components/ui/button";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";
import { motion } from "framer-motion";

type ButtonVariant =
  | "default"
  | "link"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost";

export function Cta({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={cn(
        "relative py-16 sm:py-20 md:py-24 lg:py-32 overflow-hidden",
        section.className,
        className,
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        {/* 动态光效 */}
        <motion.div
          className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full bg-secondary/10 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container px-4 sm:px-6">
        <div className="text-center">
          <ScrollAnimation>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-balance text-foreground px-4">
              {section.title}
            </h2>
          </ScrollAnimation>
          <ScrollAnimation delay={0.15}>
            <p
              className="mt-3 sm:mt-4 text-sm sm:text-base text-foreground px-4"
              dangerouslySetInnerHTML={{ __html: section.description ?? "" }}
            />
          </ScrollAnimation>

          <ScrollAnimation delay={0.3}>
            <div className="mt-8 sm:mt-10 md:mt-12 lg:mt-16 flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 px-4">
              {section.buttons?.map((button, idx) => {
                const btn = button as any;
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
                  <Button
                    asChild
                    size="lg"
                    variant={safeVariant}
                    key={idx}
                    className={cn(
                      "h-auto min-h-12 sm:min-h-14 text-xs sm:text-base md:text-lg font-bold",
                      "flex items-center justify-center gap-2 whitespace-nowrap text-center",
                      "px-4 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-full",
                      "shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105",
                    )}
                  >
                    <Link
                      href={btn.url || ""}
                      target={btn.target || "_self"}
                      className="flex items-center justify-center gap-2"
                    >
                      {btn.icon && (
                        <SmartIcon
                          name={btn.icon as string}
                          className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
                        />
                      )}
                      <span className="break-words">{btn.title}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </ScrollAnimation>
        </div>
      </div>
    </section>
  );
}
