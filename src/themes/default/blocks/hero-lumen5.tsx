"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { SmartIcon } from "@/shared/blocks/common";
import { useRequireAuth } from "@/shared/hooks/use-require-auth";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";
import { HomeCtaButton } from "./home-cta-button";

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
  featured_video?: {
    src: string;
    poster?: string;
  };
  watch_page?: {
    url: string;
    title?: string;
    link_title?: string;
  };
  partner_logos?: Array<{
    src: string;
    alt: string;
  }>;
  trust_title?: string;
}

// Hero video player with controls
function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleMouseEnter = () => {
    clearTimeout(hideTimerRef.current);
    setShowControls(true);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => setShowControls(false), 1500);
  };

  const handleTap = () => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    return () => clearTimeout(hideTimerRef.current);
  }, []);

  return (
    <div
      className="relative group rounded-lg overflow-hidden cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTap}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-auto rounded-lg object-contain"
      />
      {/* Controls overlay */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Center play/pause */}
        <button
          onClick={togglePlay}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-110"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>
      </div>
      {/* Bottom-right mute toggle */}
      <button
        onClick={toggleMute}
        className={cn(
          "absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-opacity duration-300 hover:bg-black/70",
          showControls ? "opacity-100" : "opacity-0",
        )}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
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
            <Image
              src={logo.src}
              alt={logo.alt}
              width={48}
              height={48}
              sizes="(min-width: 640px) 48px, 40px"
              className="h-full w-full object-cover"
            />
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
        <Image
          src="https://cdn.lumen5.com/lumen5-site-images/2025-website-assets/landing/Gradient%20Backgrounds-01-1280.webp"
          alt="Background gradient"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 via-background to-blue-50/40 dark:from-amber-950/30 dark:via-background dark:to-blue-950/20" />
      </div>

      <div className="container mx-auto sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row lg:gap-16 items-center justify-center py-20">
          {/* Video/Image - shows first on mobile, second on desktop */}
          <div className="w-full lg:flex-1 sm:max-w-[480px] max-w-[450px] order-first lg:order-last py-4 lg:py-15">
            {section.featured_video ? (
              <HeroVideo
                src={section.featured_video.src}
                poster={
                  section.featured_video.poster || section.featured_image?.src
                }
              />
            ) : section.featured_image ? (
              <Image
                src={section.featured_image.src}
                alt={section.featured_image.alt || "Hero illustration"}
                width={section.featured_image.width || 960}
                height={section.featured_image.height || 720}
                priority
                sizes="(min-width: 1024px) 480px, 100vw"
                className="w-full h-auto rounded-lg object-contain p-l5-32"
              />
            ) : (
              <Image
                src="/imgs/avatars/HomeHeroStatic3-1280.webp"
                alt="Personalized Bible Video"
                width={1280}
                height={960}
                priority
                sizes="(min-width: 1024px) 480px, 100vw"
                className="w-full h-auto rounded-lg object-contain p-l5-32"
              />
            )}
          </div>

          {/* Text content - shows second on mobile, first on desktop */}
          <div className="text-center lg:text-left w-full lg:flex-1 lg:max-w-[700px] order-last lg:order-first py-4 lg:py-10 lg:-ml-30">
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
              <div className="mt-6 sm:mt-8 flex flex-col items-center sm:flex-row sm:flex-wrap gap-3 justify-center">
                {section.buttons.map((button, index) => (
                  <HomeCtaButton
                    key={index}
                    title={button.title}
                    sectionIcon="heroLumen5"
                    onClick={() => navigateWithAuth(button.url)}
                  />
                ))}
              </div>
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
