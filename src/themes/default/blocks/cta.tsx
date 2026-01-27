"use client";

import { Link } from "@/core/i18n/navigation";
import { SmartIcon } from "@/shared/blocks/common/smart-icon";
import { Button } from "@/shared/components/ui/button";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

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
        "py-8 sm:py-10 md:py-12 lg:py-16",
        section.className,
        className,
      )}
    >
      <div className="container px-4 sm:px-6">
        <div className="text-center">
          <ScrollAnimation>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-balance px-4">
              {section.title}
            </h2>
          </ScrollAnimation>
          <ScrollAnimation delay={0.15}>
            <p
              className="mt-3 sm:mt-4 text-sm sm:text-base px-4"
              dangerouslySetInnerHTML={{ __html: section.description ?? "" }}
            />
          </ScrollAnimation>

          <ScrollAnimation delay={0.3}>
            <div className="mt-6 sm:mt-8 md:mt-10 lg:mt-12 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 px-4">
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
                    size={btn.size || "default"}
                    variant={safeVariant}
                    key={idx}
                    className={cn(
                      "h-auto min-h-11 text-sm sm:min-h-12 sm:text-base",
                      "flex items-center justify-center gap-2 whitespace-normal break-words text-center",
                      "px-4 sm:px-6 py-2.5 sm:py-3",
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
                          className="h-4 w-4 sm:h-5 sm:w-5 shrink-0"
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
