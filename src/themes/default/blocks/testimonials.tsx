"use client";

import { useRef, useState } from "react";
import { Play, Star, Check, X } from "lucide-react";
import { LazyImage } from "@/shared/blocks/common";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useRequireAuth } from "@/shared/hooks/use-require-auth";
import { cn } from "@/shared/lib/utils";
import { Section, SectionItem } from "@/shared/types/blocks/landing";
import { HomeCtaButton } from "./home-cta-button";

interface TestimonialItem extends SectionItem {
  type?: "video" | "text";
  video?: {
    thumbnail?: string;
    video_url?: string;
    title?: string;
    subtitle?: string;
  };
  audioSrc?: string;
  stars?: number;
  text?: string;
  avatar?: {
    src?: string;
  };
  user?: {
    name?: string;
    location?: string;
  };
}

export function Testimonials({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const { navigateWithAuth } = useRequireAuth({
    callbackUrl: "/ai-video-generator",
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [selectedVideo, setSelectedVideo] = useState<TestimonialItem | null>(
    null,
  );
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const items = (section.items as TestimonialItem[]) || [];

  const handleOpenVideo = (item: TestimonialItem) => {
    setSelectedVideo(item);
    setIsVideoOpen(true);
  };

  const handleCloseVideo = () => {
    setIsVideoOpen(false);
    setSelectedVideo(null);
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = 256 + 12;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, items.length - 1));
  };

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = 256 + 12;
    scrollRef.current.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  const VideoCard = ({ item }: { item: TestimonialItem }) => {
    const thumbnailUrl = item.video?.thumbnail || item.image?.src || "";

    return (
      <div
        className="relative rounded-2xl overflow-hidden flex-shrink-0 w-64 h-80 cursor-pointer group"
        onClick={() => handleOpenVideo(item)}
      >
        <div className="bg-gray-900 h-full">
          <div className="h-full relative">
            <LazyImage
              src={thumbnailUrl}
              alt={item.video?.title || item.title || ""}
              fill
              sizes="256px"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-[#b94d23] rounded-full flex items-center justify-center group-hover:bg-[#a13f18] transition-colors shadow-lg">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-white font-semibold text-sm truncate leading-tight">
                    {item.video?.title || item.title}
                  </p>
                  <p className="text-white/70 text-xs truncate leading-tight">
                    {item.video?.subtitle || item.user?.location}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TextCard = ({ item }: { item: TestimonialItem }) => {
    const rating = item.stars || 5;

    return (
      <div className="relative rounded-2xl overflow-hidden flex-shrink-0 w-64 h-80">
        <div className="bg-white dark:bg-card h-full p-6 flex flex-col relative">
          {item.audioSrc && (
            <div className="absolute top-4 right-4">
              <button
                className="w-8 h-8 bg-[#b94d23] hover:bg-[#a13f18] text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
                onClick={() => {
                  const audio = document.getElementById(
                    `testimonial-audio-${item.id}`,
                  ) as HTMLAudioElement;
                  if (audio) {
                    audio.paused ? audio.play() : audio.pause();
                  }
                }}
              >
                <Play className="w-3 h-3 fill-white" />
              </button>
              {item.audioSrc && (
                <audio
                  id={`testimonial-audio-${item.id}`}
                  preload="metadata"
                  className="hidden"
                >
                  <source src={item.audioSrc} type="audio/mpeg" />
                </audio>
              )}
            </div>
          )}

          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-4 h-4",
                  i < rating
                    ? "text-[#b94d23] fill-[#b94d23]"
                    : "text-gray-300",
                )}
              />
            ))}
          </div>

          <div className="flex-1 mb-4 overflow-hidden">
            <p
              className="text-gray-900 dark:text-foreground text-sm leading-relaxed line-clamp-6"
              dangerouslySetInnerHTML={{
                __html: item.text || item.quote || item.description || "",
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            {item.avatar?.src && (
              <div className="relative h-10 w-10 overflow-hidden rounded-full">
                <LazyImage
                  src={item.avatar.src}
                  alt={item.user?.name || ""}
                  fill
                  sizes="40px"
                  className="w-10 h-10 rounded-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-foreground text-sm">
                {item.user?.name}
              </p>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#b94d23] rounded-full flex items-center justify-center">
                  <Check className="w-2 h-2 text-white" />
                </div>
                <span className="text-xs text-gray-600 dark:text-muted-foreground">
                  {item.user?.location || "Verified Customer"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TestimonialCard = ({ item }: { item: TestimonialItem }) => {
    if (item.type === "video") {
      return <VideoCard item={item} />;
    }
    return <TextCard item={item} />;
  };

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
          <div className="mx-auto max-w-2xl text-center text-balance mb-8 md:mb-12">
            <h2 className="text-foreground mb-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {section.title}
            </h2>
            {section.description && (
              <p className="text-muted-foreground text-sm sm:text-base">
                {section.description}
              </p>
            )}
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0.2}>
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex gap-3 overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {items.map((item, index) => (
                <TestimonialCard key={index} item={item} />
              ))}
            </div>
          </div>
        </ScrollAnimation>

        {items.length > 0 && (
          <div className="flex justify-center mt-6 gap-2">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === activeIndex
                    ? "bg-gray-900 dark:bg-white"
                    : "bg-gray-300 dark:bg-gray-600",
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {section.buttons && section.buttons.length > 0 && (
          <ScrollAnimation delay={0.4}>
            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col items-center sm:flex-row sm:flex-wrap sm:justify-center gap-3 sm:gap-4 px-4">
              {section.buttons.map((button, index) => {
                const btn = button as any;
                return (
                  <HomeCtaButton
                    key={index}
                    title={btn.title}
                    sectionIcon="testimonials"
                    onClick={() => navigateWithAuth(btn.url || "")}
                    className={cn(
                      "max-w-full",
                    )}
                  />
                );
              })}
            </div>
          </ScrollAnimation>
        )}

        {/* Video Dialog */}
        <Dialog open={isVideoOpen} onOpenChange={setIsVideoOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black border-none overflow-hidden">
            <DialogTitle className="sr-only">
              {selectedVideo?.video?.title || "Video"}
            </DialogTitle>
            <div className="relative">
              {selectedVideo?.video?.video_url && (
                <video
                  src={selectedVideo.video.video_url}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[80vh]"
                  onEnded={handleCloseVideo}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
