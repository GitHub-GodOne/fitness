"use client";

import { ArrowBigRight } from "lucide-react";

import { SmartIcon } from "@/shared/blocks/common";
import { Button } from "@/shared/components/ui/button";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";
import { Link } from "@/core/i18n/navigation";

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

export function FeaturesStep({
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
        "",
        section.className,
        className,
      )}
    >
      <div className="m-4 rounded-[2rem]">
        <div className="@container relative container px-4 sm:px-6">
          <ScrollAnimation>
            <div className="mx-auto max-w-3xl text-center">
              {section.label && (
                <span className="text-primary text-sm sm:text-base">
                  {section.label}
                </span>
              )}
              <h2 className="text-foreground mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl font-semibold">
                {section.title}
              </h2>
              <p className="text-muted-foreground mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-balance px-4">
                {section.description}
              </p>
            </div>
          </ScrollAnimation>

          <ScrollAnimation delay={0.2}>
            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col items-center gap-4 sm:gap-6">
              {section.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 sm:gap-4 text-left max-w-md w-full px-4"
                >
                  <span className="flex size-8 sm:size-10 items-center justify-center rounded-full bg-primary/10 text-base sm:text-lg font-bold text-primary shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <h3
                      className="text-foreground text-base sm:text-lg md:text-xl font-semibold"
                      dangerouslySetInnerHTML={{ __html: item.title || "" }}
                    />
                    {item.description && (
                      <p
                        className="text-muted-foreground text-sm sm:text-base mt-1"
                        dangerouslySetInnerHTML={{ __html: item.description }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimation>

          {/* CTA Buttons */}
          {section.buttons && section.buttons.length > 0 && (
            <ScrollAnimation delay={0.4}>
              <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
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
                    <Button
                      key={index}
                      asChild
                      size="default"
                      variant={safeVariant}
                      className={cn(
                        "h-auto min-h-11 text-sm font-semibold sm:h-12 sm:text-base",
                        "flex items-center justify-center gap-2 whitespace-normal break-words text-center",
                        "w-full sm:w-auto max-w-full px-4 sm:px-6 py-2.5 sm:py-3",
                      )}
                    >
                      <Link
                        href={btn.url || ""}
                        target={btn.target || "_self"}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto"
                      >
                        {btn.icon && (
                          <SmartIcon
                            name={btn.icon}
                            className="h-4 w-4 sm:h-5 sm:w-5 shrink-0"
                          />
                        )}
                        <span className="break-words overflow-wrap-anywhere">
                          {btn.title}
                        </span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </ScrollAnimation>
          )}
        </div>
      </div>
    </section>
  );
}
