"use client";

import { LazyImage } from "@/shared/blocks/common";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

export function FeaturesFlow({ section }: { section: Section }) {
  if (!section.items || section.items.length === 0) {
    return null;
  }

  return (
    <section
      id={section.id || section.name}
      className={cn("py-16 md:py-24", section.className)}
    >
      <ScrollAnimation
        className="container mb-12 text-center"
        delay={0}
      >
        {section.sr_only_title && (
          <h1 className="sr-only">{section.sr_only_title}</h1>
        )}
        <h2 className="mx-auto mb-6 max-w-full text-3xl font-bold text-pretty md:max-w-5xl lg:text-4xl">
          {section.title}
        </h2>
        <p className="text-muted-foreground text-md mx-auto mb-4 max-w-full md:max-w-5xl">
          {section.description}
        </p>
      </ScrollAnimation>
      <div className="container flex flex-col items-center justify-center space-y-8 px-6 md:space-y-16">
        {section.items.map((item, index) => {
          const isImageRight = item.image_position === "right";
          return (
            <ScrollAnimation
              key={index}
              className={cn(
                "grid items-center gap-6 py-16 sm:grid-cols-2 md:gap-12 lg:gap-24",
                isImageRight &&
                  "sm:[&>*:first-child]:order-2 sm:[&>*:last-child]:order-1",
              )}
              delay={index * 0.12}
            >
              <ScrollAnimation delay={index * 0.12 + 0.12}>
                <LazyImage
                  src={item.image?.src ?? ""}
                  width={720}
                  height={480}
                  className="rounded-2xl"
                  alt={item.image?.alt ?? ""}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </ScrollAnimation>

              <ScrollAnimation
                className="relative space-y-4"
                delay={index * 0.12 + 0.2}
                direction={isImageRight ? "right" : "left"}
              >
                <h3 className="text-xl font-medium md:text-2xl lg:text-2xl">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </ScrollAnimation>
            </ScrollAnimation>
          );
        })}
      </div>
    </section>
  );
}
