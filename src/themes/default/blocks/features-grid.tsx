"use client";

import { Gift } from "lucide-react";

import { LazyImage } from "@/shared/blocks/common";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { useRequireAuth } from "@/shared/hooks/use-require-auth";
import { Section } from "@/shared/types/blocks/landing";
import { HomeCtaButton } from "./home-cta-button";

export function FeaturesGrid({ section }: { section: Section }) {
  const { navigateWithAuth } = useRequireAuth({
    callbackUrl: "/ai-video-generator",
  });

  return (
    <section
      id={section.id || section.name}
      className={cn("py-16 md:py-24", section.className)}
    >
      <div className="container mx-auto max-w-4xl px-4">
        <ScrollAnimation className="mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-center">
            {section.title}
          </h2>
        </ScrollAnimation>

        {section.description && (
          <ScrollAnimation className="mb-8" delay={0.1}>
            <p className="text-center text-muted-foreground">
              {section.description}
            </p>
          </ScrollAnimation>
        )}

        <ScrollAnimation className="mb-12">
          <div className="grid grid-cols-3 gap-4">
          {section.items?.map((item, index) => (
            <div
              key={item.title}
              className="relative rounded-xl overflow-hidden aspect-[4/3] cursor-pointer group transition-transform duration-300 hover:scale-[1.05]"
              style={{ transitionDelay: `${index * 60}ms` }}
              onClick={() => navigateWithAuth("/ai-video-generator")}
            >
              <LazyImage
                src={item.image?.src || item.image?.src || ""}
                alt={item.image?.alt || item.title || ""}
                fill
                sizes="(max-width: 768px) 33vw, 240px"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <h3 className="text-white text-sm md:text-base font-semibold text-center">
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
          </div>
        </ScrollAnimation>

        {section.buttons && section.buttons.length > 0 && (
          <ScrollAnimation delay={0.2}>
            <div className="flex w-full justify-center text-center">
            {section.buttons.map((button) => (
              <HomeCtaButton
                key={button.title}
                title={button.title || ""}
                sectionIcon="featuresGrid"
                leftIcon={<Gift className="mr-2 h-5 w-5 shrink-0" />}
                onClick={() => navigateWithAuth(button.url || "/ai-video-generator")}
              />
            ))}
            </div>
          </ScrollAnimation>
        )}
      </div>
    </section>
  );
}
