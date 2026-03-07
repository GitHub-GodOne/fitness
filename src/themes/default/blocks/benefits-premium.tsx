"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Shirt, Droplet, Clock } from "lucide-react";

import { SmartIcon } from "@/shared/blocks/common";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

// 图标映射
const iconMap: Record<string, any> = {
  Shirt,
  Droplet,
  Clock,
};

// 渐变背景配置
const gradients = [
  "from-blue-500/20 via-cyan-500/20 to-teal-500/20",
  "from-purple-500/20 via-pink-500/20 to-rose-500/20",
  "from-amber-500/20 via-orange-500/20 to-red-500/20",
];

// 单个优势卡片组件
function BenefitCard({
  item,
  index,
}: {
  item: {
    title?: string;
    description?: string;
    icon?: string | React.ReactNode;
  };
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0.8, 1, 1, 0.8],
  );

  const IconComponent =
    typeof item.icon === "string" && item.icon ? iconMap[item.icon] : null;
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={cardRef}
      style={{ opacity, scale }}
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center mb-24 lg:mb-32",
        !isEven && "lg:grid-flow-dense",
      )}
    >
      {/* 图标/视觉区域 */}
      <motion.div
        style={{ y }}
        className={cn("relative", !isEven && "lg:col-start-2")}
      >
        <div className="relative aspect-square max-w-md mx-auto">
          {/* 背景渐变光晕 */}
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full blur-3xl opacity-60",
              `bg-gradient-to-br ${gradients[index % gradients.length]}`,
            )}
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* 主圆形容器 */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-foreground/10 shadow-2xl flex items-center justify-center overflow-hidden">
            {/* 动态网格背景 */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                  linear-gradient(to right, currentColor 1px, transparent 1px),
                  linear-gradient(to bottom, currentColor 1px, transparent 1px)
                `,
                  backgroundSize: "40px 40px",
                }}
              />
            </div>

            {/* 图标 */}
            <motion.div
              className="relative z-10"
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {IconComponent && (
                <IconComponent
                  className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 text-primary"
                  strokeWidth={1.5}
                />
              )}
            </motion.div>

            {/* 装饰圆环 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border border-primary/20"
                style={{
                  scale: 1 + i * 0.15,
                }}
                animate={{
                  rotate: [0, 360],
                  opacity: [0.3, 0.1, 0.3],
                }}
                transition={{
                  duration: 10 + i * 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}

            {/* 浮动粒子 */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/40"
                style={{
                  left: `${20 + i * 10}%`,
                  top: `${30 + (i % 3) * 20}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, Math.sin(i) * 20, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* 序号标签 */}
          <motion.div
            className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-2xl font-black shadow-lg"
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            {index + 1}
          </motion.div>
        </div>
      </motion.div>

      {/* 文案区域 */}
      <motion.div
        className={cn("space-y-6", !isEven && "lg:col-start-1 lg:row-start-1")}
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {/* 标题 */}
        <div className="space-y-4">
          <motion.div
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
            whileHover={{ scale: 1.05 }}
          >
            {IconComponent && (
              <IconComponent className="w-5 h-5 text-primary" />
            )}
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              Benefit {index + 1}
            </span>
          </motion.div>

          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight">
            {item.title}
          </h3>
        </div>

        {/* 描述 */}
        <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
          {item.description}
        </p>

        {/* 装饰性特征列表 */}
        <div className="flex flex-wrap gap-3 pt-4">
          {["Professional", "Discreet", "Effective"].map((tag, i) => (
            <motion.span
              key={tag}
              className="px-4 py-2 rounded-full bg-foreground/5 border border-foreground/10 text-sm font-medium text-foreground/70"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1 }}
              whileHover={{ scale: 1.05, borderColor: "currentColor" }}
            >
              {tag}
            </motion.span>
          ))}
        </div>

        {/* 进度指示器 */}
        <motion.div
          className="w-full h-1 bg-foreground/10 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-secondary"
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function BenefitsPremium({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const items = section.items || [];

  return (
    <section
      id={section.id}
      className={cn(
        "relative py-20 md:py-32 lg:py-40 overflow-hidden",
        section.className,
        className,
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        {/* 渐变网格 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />

        {/* 动态光效 */}
        <motion.div
          className="absolute top-1/4 -left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-1/4 w-96 h-96 rounded-full bg-secondary/10 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container px-4 sm:px-6 lg:px-8">
        {/* 标题区域 */}
        <motion.div
          className="text-center mb-16 lg:mb-24 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* 预标题 */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6"
            whileHover={{ scale: 1.05 }}
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            CORE BENEFITS
          </motion.div>

          {/* 主标题 */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground mb-6 leading-tight">
            {section.title}
          </h2>

          {section.description && (
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
              {section.description}
            </p>
          )}

          {/* 装饰线 */}
          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-primary to-secondary rounded-full mx-auto mt-8"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </motion.div>

        {/* 优势卡片列表 */}
        <div className="relative">
          {items.map((item, index) => (
            <BenefitCard key={index} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
