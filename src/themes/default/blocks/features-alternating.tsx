"use client";

import Image from "next/image";
import { SmartIcon } from "@/shared/blocks/common/smart-icon";
import { Button } from "@/shared/components/ui/button";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { useRequireAuth } from "@/shared/hooks/use-require-auth";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

type ButtonVariant =
  | "default"
  | "link"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost";

interface FeaturesAlternatingItem {
  title: string;
  description: string;
  icon?: string;
  image?: {
    src: string;
    alt: string;
  };
  video?: {
    src: string;
    poster?: string;
  };
  [key: string]: any;
}

type FeaturesAlternatingSection = Section & {
  items?: FeaturesAlternatingItem[];
};

export function FeaturesAlternating({
  section,
  className,
}: {
  section: FeaturesAlternatingSection;
  className?: string;
}) {
  const { navigateWithAuth } = useRequireAuth({
    callbackUrl: "/ai-video-generator",
  });
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
        {/* Section Title */}
        {section.title && (
          <ScrollAnimation>
            <div className="mx-auto max-w-4xl text-center text-balance mb-12 sm:mb-16 lg:mb-20">
              <h2 className="text-foreground mb-4 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                {section.title}
              </h2>
              {section.description && (
                <p className="text-muted-foreground text-sm sm:text-base px-4">
                  {section.description}
                </p>
              )}
            </div>
          </ScrollAnimation>
        )}

        {/* Alternating rows */}
        <div className="space-y-16 sm:space-y-20 lg:space-y-24">
          {section.items?.map((item, idx) => {
            const isEven = idx % 2 === 0;
            const hasMedia = item.image || item.video;

            return (
              <ScrollAnimation key={idx} delay={idx * 0.1}>
                <div
                  className={cn(
                    "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center",
                    !hasMedia && "lg:grid-cols-1 max-w-3xl mx-auto",
                  )}
                >
                  {/* Text Content */}
                  <div
                    className={cn(
                      "text-center lg:text-left",
                      !isEven && hasMedia && "lg:order-2",
                    )}
                  >
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground mb-4">
                      {item.title}
                    </h3>
                    <p
                      className="text-sm sm:text-base text-muted-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: item.description || "",
                      }}
                    />
                  </div>

                  {/* Media Content */}
                  {hasMedia && (
                    <div
                      className={cn(
                        "relative flex justify-center lg:justify-center",
                        !isEven && "lg:order-1",
                      )}
                    >
                      {item.video ? (
                        <div className="relative rounded-xl overflow-hidden shadow-2xl w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[400px]">
                          <video
                            className="w-full h-auto"
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="metadata"
                            poster={item.video?.poster || undefined}
                          >
                            <source src={item.video.src} type="video/webm" />
                          </video>
                        </div>
                      ) : item.image ? (
                        <div className="relative rounded-xl overflow-hidden shadow-2xl w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[400px]">
                          <Image
                            src={item.image.src}
                            alt={item.image.alt || ""}
                            width={400}
                            height={300}
                            className="w-full h-auto object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Buttons - Full width on mobile, positioned at bottom */}
                  {section.buttons &&
                    section.items &&
                    idx === section.items.length - 1 && (
                      <div className="col-span-1 lg:col-span-2 mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                        {section.buttons.map((button, btnIdx) => {
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
                              key={btnIdx}
                              variant={safeVariant}
                              size="lg"
                              onClick={() => navigateWithAuth(btn.url)}
                            >
                              {btn.title}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                </div>
              </ScrollAnimation>
            );
          })}
        </div>
      </div>
    </section>
  );
}
