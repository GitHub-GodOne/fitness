"use client";

import { LazyImage } from "@/shared/blocks/common";
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

export function FounderLetter({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const { navigateWithAuth } = useRequireAuth({
    callbackUrl: "/ai-video-generator",
  });

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
          <div className="mx-auto max-w-2xl text-center">
            {/* Title */}
            <h2 className="text-foreground mb-6 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {section.title}
            </h2>

            {/* Founder photo */}
            {founderImage && (
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-md">
                  <LazyImage
                    src={founderImage}
                    alt={founderName || "Founder"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Paragraphs */}
            <div className="space-y-4 mb-6">
              {paragraphs.map((paragraph, index) => (
                <ScrollAnimation key={index} delay={0.1 * (index + 1)}>
                  <p
                    className="text-muted-foreground text-sm sm:text-base leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: paragraph }}
                  />
                </ScrollAnimation>
              ))}
            </div>

            {/* Signature */}
            <ScrollAnimation delay={0.3}>
              <div className="flex flex-col items-center gap-2 mb-8">
                {signatureImage && (
                  <LazyImage
                    src={signatureImage}
                    alt="Signature"
                    className="h-10 sm:h-12 w-auto opacity-80"
                  />
                )}
                {founderName && (
                  <p className="text-foreground font-medium text-sm sm:text-base">
                    — {founderName}
                  </p>
                )}
              </div>
            </ScrollAnimation>

            {/* CTA Buttons */}
            {section.buttons && section.buttons.length > 0 && (
              <ScrollAnimation delay={0.4}>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  {section.buttons.map((button, index) => {
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
                        key={index}
                        size="default"
                        className={cn(
                          "h-auto min-h-11 sm:min-h-12 text-sm sm:text-base px-4 sm:px-6 md:px-8 font-semibold shadow-lg hover:shadow-xl transition-all",
                          "flex items-center justify-center gap-2 whitespace-normal break-words text-center",
                          "w-full sm:w-auto max-w-full py-2.5 sm:py-3",
                        )}
                        variant={safeVariant}
                        onClick={() => navigateWithAuth(btn.url || "")}
                      >
                        <span className="break-words overflow-wrap-anywhere">
                          {btn.title}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </ScrollAnimation>
            )}
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
