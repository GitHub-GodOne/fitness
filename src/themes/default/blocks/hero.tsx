"use client";

import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useEffect, useState, useRef, useMemo } from "react";
import { Zap } from "lucide-react";

import { Link } from "@/core/i18n/navigation";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

// 扩展Section类型以支持新的字段
interface HeroSection extends Section {
  eyebrow?: string;
  quote?: string;
  title_line1?: string;
  title_line2?: string;
  cta?: string;
  trusted_by?: string;
  demo_video_title?: string;
}

// 预定义的粒子位置，避免hydration mismatch
const PARTICLE_POSITIONS = [
  { left: 15, top: 20, duration: 3.2, delay: 0.1 },
  { left: 85, top: 10, duration: 4.1, delay: 0.5 },
  { left: 45, top: 80, duration: 3.8, delay: 1.2 },
  { left: 25, top: 60, duration: 4.5, delay: 0.3 },
  { left: 75, top: 40, duration: 3.5, delay: 1.8 },
  { left: 55, top: 15, duration: 4.2, delay: 0.7 },
  { left: 35, top: 90, duration: 3.9, delay: 1.5 },
  { left: 65, top: 70, duration: 4.0, delay: 0.9 },
  { left: 10, top: 45, duration: 3.6, delay: 1.1 },
  { left: 90, top: 55, duration: 4.3, delay: 0.4 },
  { left: 20, top: 85, duration: 3.4, delay: 1.7 },
  { left: 80, top: 25, duration: 4.4, delay: 0.2 },
  { left: 50, top: 50, duration: 3.7, delay: 1.0 },
  { left: 30, top: 35, duration: 4.6, delay: 0.6 },
  { left: 70, top: 75, duration: 3.3, delay: 1.4 },
  { left: 40, top: 5, duration: 4.7, delay: 0.8 },
  { left: 60, top: 95, duration: 3.1, delay: 1.6 },
  { left: 5, top: 65, duration: 4.8, delay: 1.3 },
  { left: 95, top: 30, duration: 3.0, delay: 1.9 },
  { left: 48, top: 42, duration: 4.9, delay: 0.0 },
];

export function Hero({
  section,
  className,
}: {
  section: HeroSection;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 鼠标跟踪效果
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // 视差效果
  const rotateX = useTransform(springY, [-300, 300], [5, -5]);
  const rotateY = useTransform(springX, [-300, 300], [-5, 5]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section
      ref={containerRef}
      id={section.id}
      className={cn(
        "relative min-h-screen overflow-hidden bg-background",
        section.className,
        className,
      )}
    >
      {/* 视频背景 */}
      <div className="absolute inset-0 z-0">
        {/* <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover"
          style={{ filter: "brightness(0.5) contrast(1.2)" }}
        >
          <source src="/1.mp4" type="video/mp4" />
        </video> */}

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background/90" />

        {/* 动态光效 */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] pointer-events-none bg-gradient-to-br from-primary to-secondary"
          style={{
            left: mousePosition.x - 300,
            top: mousePosition.y - 300,
          }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* 动态粒子效果 - 仅在客户端渲染 */}
      {mounted && (
        <div className="absolute inset-0 z-1 overflow-hidden pointer-events-none">
          {PARTICLE_POSITIONS.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* 主内容区域 - 左右分栏布局 */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-16 lg:pt-20 pb-12 sm:pb-16 lg:pb-20 min-h-screen flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          {/* 左侧：文案内容 - 在移动端显示在下方 */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col space-y-6 lg:space-y-8 text-center lg:text-left order-2 lg:order-1"
          >
            {/* Eyebrow - 红色醒目 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-red-500/10 backdrop-blur-sm border border-red-500/30 text-xs sm:text-sm md:text-base font-bold tracking-wide uppercase text-red-600 dark:text-red-400 whitespace-nowrap">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                {section.eyebrow || "STIFF NECK? ACHING LOWER BACK?"}
              </span>
            </motion.div>

            {/* 主标题 H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight"
            >
              <span className="block text-foreground">
                {section.title_line1 || "Turn Your Workspace Into"}
              </span>
              <motion.span
                className="block mt-2 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                {section.title_line2 || "an Instant Relief Station"}
              </motion.span>
            </motion.h1>

            {/* 副标题 */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0"
            >
              {section.description || "AI-powered ergonomic stretches designed for desk workers. Relieve tension in under 3 minutes using just your chair and desk. No gym clothes. No sweating. No equipment."}
            </motion.p>

            {/* CTA按钮 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col items-center lg:items-start gap-4"
            >
              <Link
                href="/ai-video-generator"
                className="group relative inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base md:text-lg font-bold rounded-full overflow-hidden transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                {/* 按钮背景动画 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    backgroundSize: "200% 200%",
                  }}
                />
                <span className="relative z-10 text-primary-foreground flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {section.cta || "Start Your Relief Plan"}
                </span>

                {/* 悬停光效 */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "radial-gradient(circle at center, rgba(255,255,255,0.3) 0%, transparent 70%)",
                  }}
                />
              </Link>

              {/* 信任背书 - 按钮下方 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="flex flex-col items-center lg:items-start gap-2"
              >
                {/* 五星评分 */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="w-5 h-5 fill-amber-500 text-amber-500"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm md:text-base text-muted-foreground font-medium">
                  {(
                    section.trusted_by ||
                    "⭐⭐⭐⭐⭐ Loved by {count}+ US desk workers"
                  ).replace("{count}", "10,000")}
                </p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 右侧：场景视频/图片 - 在移动端显示在上方 */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative w-full order-1 lg:order-2"
          >
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-foreground/10 bg-muted">
              {/* 视频 */}
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/video/380c4931-5d5a-42b1-a83b-87cd219ffa1b.mp4" type="video/mp4" />
              </video>
            </div>

            {/* 装饰元素 */}
            <motion.div
              className="absolute -z-10 -top-4 -right-4 w-72 h-72 rounded-full opacity-20 blur-3xl bg-gradient-to-br from-primary to-secondary"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
