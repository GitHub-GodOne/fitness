'use client';

import { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { SmartIcon } from '@/shared/blocks/common';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

interface HeroVideoButton {
  title: string;
  url: string;
  target?: string;
  variant?: 'link' | 'default' | 'destructive' | 'outline' | 'ghost';
  icon?: string;
}

interface HeroVideoSection extends Omit<Section, 'buttons'> {
  title?: string;
  highlight_text?: string;
  description?: string;
  buttons?: HeroVideoButton[];
  tip?: string;
  announcement?: {
    title: string;
    url: string;
    target?: string;
  };
  featured_video?: {
    src: string;
    poster?: string;
    caption?: string;
  };
  social_proof?: {
    title: string;
    avatars?: Array<{
      src: string;
      alt: string;
    }>;
  };
}

export function HeroVideo({
  section,
  className,
}: {
  section: HeroVideoSection;
  className?: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.muted = false; // Enable sound when user clicks to play
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Auto-stop video after 1 minute
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= 60) { // 60 seconds = 1 minute
        video.pause();
        setIsPlaying(false);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

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
        <span className="relative inline-block">
          <span className="relative z-10 text-primary">
            {highlightText}
          </span>
        </span>
        {parts[1]}
      </>
    );
  };

  return (
    <section
      id={section.id}
      className={cn(
        'relative overflow-hidden min-h-screen flex items-center pt-20 pb-8 sm:pt-24 sm:pb-12 md:pt-28 md:pb-16 lg:py-20',
        section.className,
        className
      )}
    >
      {/* Background decorative elements - Biblical theme */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
      </div>

      <div className="w-full">
        {/* Video Section - Top, Full Width on Mobile */}
        <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
        {section.featured_video && (
          <div className="relative w-full mx-auto max-w-5xl px-0 sm:px-6 md:px-8">
                {/* Video Container with Decorative Border */}
                <div className="relative rounded-none sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl">
                  {/* Decorative border - Biblical colors */}
                  <div className="absolute -inset-1 bg-primary/40 rounded-none sm:rounded-2xl lg:rounded-3xl blur-sm opacity-60 group-hover:opacity-80 transition duration-500" />
                  
                  {/* Video wrapper */}
                  <div className="relative bg-muted/30 rounded-none sm:rounded-2xl lg:rounded-3xl overflow-hidden aspect-video">
                    <video
                      ref={videoRef}
                      src={section.featured_video.src}
                      poster={section.featured_video.poster}
                      className="w-full h-full object-contain cursor-pointer bg-black"
                      playsInline
                      muted
                      preload="auto"
                      onClick={handleVideoClick}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />

                    {/* Play Button Overlay (shown when not playing) - Bottom Right */}
                    {!isPlaying && (
                      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
                        <button
                          onClick={handleVideoClick}
                          className="group relative"
                          aria-label="Play video"
                        >
                          {/* Subtle glow effect */}
                          <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl group-hover:bg-accent/30 transition-all" />
                          <div className="relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/95 backdrop-blur-sm shadow-xl transition-all group-hover:bg-white group-hover:scale-105 border-2 border-accent/50">
                            <Play className="w-5 h-5 sm:w-6 sm:h-6 text-primary ml-0.5" fill="currentColor" />
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Decorative glow effects - hidden on mobile */}
                <div className="hidden sm:block absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-primary/10 blur-3xl rounded-full" />
              </div>
            )}
          </div>

      {/* Content Section - Below Video */}
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 lg:space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          {/* Title */}
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mx-auto leading-tight px-2 whitespace-normal break-words">
            {renderTitle()}
          </h1>

          {/* Description */}
          {section.description && (
            <p 
              className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mx-auto px-4 whitespace-normal break-words"
              dangerouslySetInnerHTML={{ __html: section.description }}
            />
          )}

          {/* CTA Buttons */}
          {section.buttons && section.buttons.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4 px-4 sm:px-0">
              {section.buttons.map((button, index) => (
                <Button
                  key={index}
                  asChild
                  variant={button.variant === 'default' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto min-h-11 text-sm font-semibold shadow-lg hover:shadow-xl transition-all sm:h-12 sm:text-base md:h-14 md:text-lg sm:px-6 md:px-8 py-2.5 sm:py-3',
                    'flex items-center justify-center gap-2 whitespace-normal break-words text-center',
                    'w-full sm:w-auto max-w-full',
                    button.variant === 'default' &&
                      'bg-primary hover:bg-primary/90 text-primary-foreground border-0'
                  )}
                >
                  <a href={button.url} target={button.target || '_self'} className="flex items-center justify-center gap-2 w-full sm:w-auto">
                    {button.icon && <SmartIcon name={button.icon} className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
                    <span className="break-words overflow-wrap-anywhere">{button.title}</span>
                  </a>
                </Button>
              ))}
            </div>
          )}

          {/* Tip */}
          {section.tip && (
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground italic px-4">
              {section.tip}
            </p>
          )}

          {/* Social Proof */}
          {section.social_proof && (
            <div className="pt-6 sm:pt-8 flex flex-col items-center gap-3 sm:gap-4">
              {/* Avatars */}
              {section.social_proof.avatars && section.social_proof.avatars.length > 0 && (
                <div className="flex -space-x-2 sm:-space-x-3">
                  {section.social_proof.avatars.map((avatar, index) => (
                    <div
                      key={index}
                      className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full border-3 border-background overflow-hidden bg-primary/10"
                    >
                      <img
                        src={avatar.src}
                        alt={avatar.alt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
              {/* Rating and text */}
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <div className="flex gap-0.5 sm:gap-1">
                  {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 fill-amber-500 text-amber-500"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                  ))}
                </div>
                <p className="text-sm sm:text-base lg:text-lg text-muted-foreground font-medium px-4">
                  {section.social_proof.title}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
