"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { SmartIcon } from "@/shared/blocks/common";
import { useRequireAuth } from "@/shared/hooks/use-require-auth";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

interface HeroLumen5Button {
  title: string;
  url: string;
  target?: string;
  variant?: "link" | "default" | "destructive" | "outline" | "ghost";
  icon?: string;
}

interface HeroLumen5Section extends Omit<Section, "buttons"> {
  title?: string;
  highlight_text?: string;
  description?: string;
  buttons?: HeroLumen5Button[];
  featured_image?: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  partner_logos?: Array<{
    src: string;
    alt: string;
  }>;
  trust_title?: string;
}

// Logo carousel component - infinite scroll
function LogoCarousel({
  logos,
}: {
  logos: Array<{ src: string; alt: string }>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || logos.length === 0) return;

    let animationId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      if (!scrollContainer) return;

      scrollPosition += scrollSpeed;
      const maxScroll = scrollContainer.scrollWidth / 3;

      if (scrollPosition >= maxScroll) {
        scrollPosition = 0;
      }

      scrollContainer.style.transform = `translateX(-${scrollPosition}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [logos]);

  // Triple the logos for seamless infinite loop
  const tripleLogos = [...logos, ...logos, ...logos];

  return (
    <div className="relative w-full overflow-hidden py-8">
      {/* Gradient overlays for smooth fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div
        ref={scrollRef}
        className="flex items-center gap-12 sm:gap-16"
        style={{ willChange: "transform" }}
      >
        {tripleLogos.map((logo, index) => (
          <div
            key={index}
            className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border-2 border-border/50"
          >
            {logo.src.startsWith("http") ? (
              <img
                src={logo.src}
                alt={logo.alt}
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={logo.src}
                alt={logo.alt}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized={logo.src.startsWith("http")}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroLumen5({
  section,
  className,
}: {
  section: HeroLumen5Section;
  className?: string;
}) {
  const { navigateWithAuth } = useRequireAuth({
    callbackUrl: "/ai-video-generator",
  });
  // Parse title to highlight specific text
  const renderTitle = () => {
    if (!section.title) return null;

    const highlightText = section.highlight_text;
    if (!highlightText) {
      return <span>{section.title}</span>;
    }

    const parts = section.title.split(highlightText);
    return (
      <>
        {parts[0]}
        <span className="text-primary">{highlightText}</span>
        {parts[1]}
      </>
    );
  };

  // Default partner logos
  const defaultLogos = [
    { src: "/imgs/logos/logo1.svg", alt: "Partner 1" },
    { src: "/imgs/logos/logo2.svg", alt: "Partner 2" },
    { src: "/imgs/logos/logo3.svg", alt: "Partner 3" },
    { src: "/imgs/logos/logo4.svg", alt: "Partner 4" },
    { src: "/imgs/logos/logo5.svg", alt: "Partner 5" },
    { src: "/imgs/logos/logo6.svg", alt: "Partner 6" },
  ];

  const partnerLogos = section.partner_logos || defaultLogos;
  const trustTitle = section.trust_title || "Trusted by believers worldwide";

  return (
    <section
      id={section.id}
      className={cn(
        "relative overflow-hidden bg-background",
        section.className,
        className,
      )}
    >
      {/* Background gradient image - Lumen5 style */}
      <div className="absolute inset-0 -z-10">
        <img
          className="w-full h-full object-cover"
          src="https://cdn.lumen5.com/lumen5-site-images/2025-website-assets/landing/Gradient%20Backgrounds-01-1280.webp"
          alt="Background gradient"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 via-background to-blue-50/40 dark:from-amber-950/30 dark:via-background dark:to-blue-950/20" />
      </div>

      <div className="container mx-auto sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row lg:gap-16 sm:items-start items-center justify-center py-20">
          {/* Left column - Text content */}
          <div className="text-center lg:text-left w-full lg:flex-1 lg:max-w-[700px] py-10 lg:-ml-30">
            {/* Main Headline */}
            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-[1.99rem] text-center font-bold tracking-tight leading-[1.15] text-foreground break-words">
              {renderTitle()}
            </h1>

            {/* Subtitle */}
            {section.description && (
              <p
                className="mt-4 sm:mt-6 text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: section.description }}
              />
            )}

            {/* CTA Buttons */}
            {section.buttons && section.buttons.length > 0 && (
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                {section.buttons.map((button, index) => (
                  <Button
                    key={index}
                    variant={
                      button.variant || (index === 0 ? "default" : "outline")
                    }
                    size="lg"
                    onClick={() => navigateWithAuth(button.url)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
                  >
                    <span className="text-sm lg:text-md">{button.title}</span>
                    {index === 0 && <ArrowRight className="h-4 w-4" />}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Right column - Static Image */}
          <div className="w-full lg:flex-1 sm:max-w-[480px] max-w-[450px] py-15">
            {section.featured_image ? (
              <img
                src={section.featured_image.src}
                alt={section.featured_image.alt || "Hero illustration"}
                className="w-full h-auto rounded-lg object-contain p-l5-32"
                loading="eager"
              />
            ) : (
              /* Default hero image with avatar */
              <img
                src="/imgs/avatars/HomeHeroStatic3-1280.webp"
                alt="Personalized Bible Video"
                className="w-full h-auto rounded-lg object-contain p-l5-32"
                loading="eager"
              />
            )}
          </div>
        </div>

        <div className="border-t border-border/30 pt-6 pb-8">
          <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {trustTitle}
          </p>
          <LogoCarousel logos={partnerLogos} />
        </div>
      </div>
    </section>
  );
}
