"use client";

import { LazyImage, SmartIcon } from "@/shared/blocks/common";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

export function FeaturesMedia({ section }: { section: Section }) {
  const imagePosition = section.image_position || "left";
  const isImageRight = imagePosition === "right";

  return (
    <section
      id={section.id || section.name}
      className={cn("py-16 md:py-24", section.className)}
    >
      <div className="container flex flex-col items-center justify-center space-y-8 px-6 md:space-y-16">
        <ScrollAnimation
          className={cn(
            "grid items-center gap-6 sm:grid-cols-2 md:gap-12 lg:gap-24",
            isImageRight &&
              "sm:[&>*:first-child]:order-2 sm:[&>*:last-child]:order-1",
          )}
        >
          <div>
            <LazyImage
              src={section.image?.src ?? ""}
              width={720}
              height={480}
              className="rounded-2xl"
              alt={section.image?.alt ?? ""}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          <div className="relative space-y-4">
            <h2 className="text-xl font-medium md:text-lg lg:text-lg">
              {section.title}
            </h2>
            <p className="text-muted-foreground text-md">
              {section.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {section.items?.map((item) => (
                <div key={item.title}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm">
                    <SmartIcon name={item.icon as string} size={16} />
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
