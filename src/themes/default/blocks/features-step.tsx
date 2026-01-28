"use client";

import { motion } from "framer-motion";
import { Camera, Sparkles, Video, Zap } from "lucide-react";

import { SmartIcon } from "@/shared/blocks/common";
import { Button } from "@/shared/components/ui/button";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";
import { Link } from "@/core/i18n/navigation";

type ButtonVariant =
  | "default"
  | "link"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost";

interface ButtonWithIcon {
  title: string;
  url: string;
  target?: string;
  variant?: string;
  icon?: string;
}

// 默认步骤图标
const defaultStepIcons = [Camera, Sparkles, Video, Zap];

// 流动箭头组件 - 燃烧/能量流效果
function FlowArrow({ isVertical = false }: { isVertical?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        isVertical ? "h-16 w-full py-2" : "w-20 h-full px-2 max-lg:hidden",
      )}
    >
      {/* 主箭头容器 */}
      <div
        className={cn(
          "relative overflow-hidden",
          isVertical ? "h-full w-2" : "w-full h-2",
        )}
      >
        {/* 背景轨道 */}
        <div
          className={cn(
            "absolute bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-full",
            isVertical ? "w-full h-full" : "w-full h-full",
          )}
        />

        {/* 流动能量效果 */}
        <motion.div
          className={cn(
            "absolute rounded-full",
            isVertical
              ? "w-full h-8 bg-gradient-to-b from-transparent via-primary to-transparent"
              : "h-full w-12 bg-gradient-to-r from-transparent via-primary to-transparent",
          )}
          animate={
            isVertical ? { y: ["-100%", "200%"] } : { x: ["-100%", "200%"] }
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* 第二层流动效果 - 延迟 */}
        <motion.div
          className={cn(
            "absolute rounded-full opacity-60",
            isVertical
              ? "w-full h-6 bg-gradient-to-b from-transparent via-secondary to-transparent"
              : "h-full w-8 bg-gradient-to-r from-transparent via-secondary to-transparent",
          )}
          animate={
            isVertical ? { y: ["-100%", "200%"] } : { x: ["-100%", "200%"] }
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </div>

      {/* 箭头头部 */}
      <motion.div
        className={cn("absolute", isVertical ? "bottom-0" : "right-0")}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <svg
          className={cn(
            "text-primary",
            isVertical ? "w-4 h-4 rotate-90" : "w-4 h-4",
          )}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
        </svg>
      </motion.div>

      {/* 粒子效果 */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary"
          animate={
            isVertical
              ? {
                  y: ["-20px", "40px"],
                  x: [(i - 1) * 4, (i - 1) * 4],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }
              : {
                  x: ["-20px", "40px"],
                  y: [(i - 1) * 4, (i - 1) * 4],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }
          }
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// 步骤卡片组件
function StepCard({
  item,
  index,
}: {
  item: { title?: string; description?: string; icon?: React.ReactNode };
  index: number;
}) {
  const IconComponent = defaultStepIcons[index % defaultStepIcons.length];
  const iconName = typeof item.icon === "string" ? item.icon : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative group"
    >
      <div className="relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
        {/* 发光效果 */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* 步骤编号 */}
        <motion.div
          className="absolute -top-3 -left-3 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-bold shadow-lg"
          whileHover={{ scale: 1.1, rotate: 10 }}
        >
          {index + 1}
        </motion.div>

        {/* 图标 */}
        <div className="relative mb-4">
          <motion.div
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            {iconName ? (
              <SmartIcon name={iconName} className="w-7 h-7 text-primary" />
            ) : (
              <IconComponent className="w-7 h-7 text-primary" />
            )}
          </motion.div>

          {/* 图标光晕 */}
          <motion.div
            className="absolute inset-0 rounded-xl bg-primary/20 blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* 内容 */}
        <div className="relative">
          <h3
            className="text-foreground text-lg font-semibold mb-2"
            dangerouslySetInnerHTML={{ __html: item.title || "" }}
          />
          {item.description && (
            <p
              className="text-muted-foreground text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function FeaturesStep({
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
        "py-16 md:py-24 overflow-hidden",
        section.className,
        className,
      )}
    >
      <div className="container px-4 sm:px-6">
        <ScrollAnimation>
          <div className="mx-auto max-w-3xl text-center mb-12 md:mb-16">
            {section.label && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
              >
                <Zap className="w-4 h-4" />
                {section.label}
              </motion.span>
            )}
            <h2 className="text-foreground text-3xl sm:text-4xl md:text-5xl font-bold">
              {section.title}
            </h2>
            {section.description && (
              <p className="text-muted-foreground mt-4 text-base md:text-lg text-balance">
                {section.description}
              </p>
            )}
          </div>
        </ScrollAnimation>

        {/* 桌面端横向布局 */}
        <div className="hidden lg:flex items-stretch justify-center gap-0">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center">
              <div className="w-64">
                <StepCard item={item} index={idx} />
              </div>
              {idx < items.length - 1 && <FlowArrow isVertical={false} />}
            </div>
          ))}
        </div>

        {/* 手机端纵向布局 */}
        <div className="lg:hidden flex flex-col items-center gap-0">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center w-full max-w-sm"
            >
              <StepCard item={item} index={idx} />
              {idx < items.length - 1 && <FlowArrow isVertical={true} />}
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        {section.buttons && section.buttons.length > 0 && (
          <ScrollAnimation delay={0.4}>
            <div className="mt-12 md:mt-16 flex flex-col sm:flex-row justify-center gap-4">
              {section.buttons.map((button, index) => {
                const btn = button as ButtonWithIcon;
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
