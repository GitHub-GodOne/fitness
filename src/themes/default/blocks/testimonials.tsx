"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import { LazyImage, SmartIcon } from "@/shared/blocks/common";
import { Button } from "@/shared/components/ui/button";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { Section, SectionItem } from "@/shared/types/blocks/landing";

type ButtonVariant =
  | "default"
  | "link"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost";

export function Testimonials({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const items = section.items || [];

  // 自动轮播
  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return;

    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, items.length]);

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
      setIsAutoPlaying(false);
      // 3秒后恢复自动播放
      setTimeout(() => setIsAutoPlaying(true), 3000);
    },
    [currentIndex],
  );

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 3000);
  }, [items.length]);

  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 3000);
  }, [items.length]);

  // 滑动动画变体
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  // 评价卡片组件
  const TestimonialCard = ({
    item,
    isActive = true,
  }: {
    item: SectionItem;
    isActive?: boolean;
  }) => {
    const rating = (item as any).rating || 5;

    return (
      <div
        className={cn(
          "bg-card border border-border rounded-2xl p-6 md:p-8 relative overflow-hidden transition-all duration-300",
          isActive ? "shadow-lg shadow-primary/10" : "opacity-60",
        )}
      >
        {/* 背景装饰 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

        {/* 引号图标 */}
        <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />

        <div className="relative">
          {/* 星级评分 */}
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-4 h-4",
                  i < rating
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground",
                )}
              />
            ))}
          </div>

          {/* 评价内容 */}
          <p className="text-foreground text-base md:text-lg leading-relaxed mb-6 italic">
            "{item.quote || item.description}"
          </p>

          {/* 用户信息 */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-primary/20 shadow-md">
                <LazyImage
                  src={item.image?.src || item.avatar?.src || ""}
                  alt={item.image?.alt || item.avatar?.alt || item.name || ""}
                  className="h-full w-full object-cover"
                />
              </div>
              {/* 在线状态指示 */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
            </div>
            <div>
              <p className="text-foreground font-semibold text-base md:text-lg">
                {item.name}
              </p>
              <p className="text-muted-foreground text-sm">
                {item.role || item.title}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      id={section.id}
      className={cn(
        "py-16 md:py-24 bg-background",
        section.className,
        className,
      )}
    >
      <div className="container px-4 sm:px-6">
        <ScrollAnimation>
          <div className="mx-auto max-w-2xl text-center mb-12 md:mb-16">
            <h2 className="text-foreground text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {section.title}
            </h2>
            {section.description && (
              <p className="text-muted-foreground text-base md:text-lg">
                {section.description}
              </p>
            )}
          </div>
        </ScrollAnimation>

        {/* 轮播区域 */}
        <div className="relative max-w-4xl mx-auto">
          {/* 桌面端：左右箭头 */}
          <div className="hidden md:block">
            <button
              onClick={goToPrev}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 lg:-translate-x-16 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:text-primary hover:border-primary transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 lg:translate-x-16 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:text-primary hover:border-primary transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* 轮播内容 */}
          <div className="overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(_, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -10000) {
                    goToNext();
                  } else if (swipe > 10000) {
                    goToPrev();
                  }
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <TestimonialCard item={items[currentIndex]} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 手机端：滑动提示 */}
          <p className="md:hidden text-center text-muted-foreground text-xs mt-4">
            ← 左右滑动查看更多 →
          </p>

          {/* 指示点 */}
          <div className="flex justify-center gap-2 mt-6">
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "w-8 bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
                )}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>

          {/* 进度条 */}
          {isAutoPlaying && (
            <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 5, ease: "linear" }}
                key={currentIndex}
              />
            </div>
          )}
        </div>

        {/* CTA按钮 */}
        {section.buttons && section.buttons.length > 0 && (
          <ScrollAnimation delay={0.4}>
            <div className="mt-12 md:mt-16 flex flex-col sm:flex-row justify-center gap-4">
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
                    asChild
                    size="lg"
                    variant={safeVariant}
                    className="group"
                  >
                    <Link
                      href={btn.url || ""}
                      target={btn.target || "_self"}
                      className="flex items-center gap-2"
                    >
                      {btn.icon && (
                        <SmartIcon
                          name={btn.icon}
                          className="h-5 w-5 group-hover:scale-110 transition-transform"
                        />
                      )}
                      <span>{btn.title}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </ScrollAnimation>
        )}
      </div>
    </section>
  );
}
