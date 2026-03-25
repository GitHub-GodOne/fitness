"use client";

import { LazyImage } from "@/shared/blocks/common";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

export function FounderStory({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const paragraphs = (section.paragraphs as string[]) || [];
  const founderName = section.founder_name as string;
  const founderImage = section.founder_image as string;
  const signatureImage = section.signature_image as string;

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
        <ScrollAnimation>
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 sm:p-8 md:p-10 lg:p-12 shadow-sm">
              {/* Title */}
              <h2 className="text-foreground mb-8 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl text-center">
                {section.title}
              </h2>

              {/* Founder photo + paragraphs */}
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Photo - top on mobile, side on desktop */}
                {founderImage && (
                  <div className="flex-shrink-0 flex justify-center md:justify-start">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-primary/20 shadow-md">
                      <LazyImage
                        src={founderImage}
                        alt={founderName || "Founder"}
                        fill
                        sizes="144px"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Letter content */}
                <div className="flex-1 space-y-4">
                  {paragraphs.map((paragraph, index) => (
                    <ScrollAnimation key={index} delay={0.1 * (index + 1)}>
                      <p
                        className="text-muted-foreground text-sm sm:text-base leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: paragraph }}
                      />
                    </ScrollAnimation>
                  ))}
                </div>
              </div>

              {/* Signature area */}
              <ScrollAnimation delay={0.3}>
                <div className="mt-8 flex flex-col items-end gap-2">
                  {signatureImage && (
                    <LazyImage
                      src={signatureImage}
                      alt="Signature"
                      width={240}
                      height={80}
                      className="h-12 sm:h-14 w-auto opacity-80"
                    />
                  )}
                  {founderName && (
                    <p className="text-foreground font-medium text-sm sm:text-base">
                      — {founderName}
                    </p>
                  )}
                </div>
              </ScrollAnimation>
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
