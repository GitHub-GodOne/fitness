"use client";

import { motion } from "framer-motion";
import { SmartIcon } from "@/shared/blocks/common/smart-icon";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

export function Features({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={cn("py-16 md:py-24", section.className, className)}
      style={{ backgroundColor: "oklch(var(--background))" }}
    >
      <div className="container px-4 sm:px-6">
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4"
            style={{ color: "oklch(var(--foreground))" }}
          >
            {section.title}
          </h2>
          <p
            className="text-lg md:text-xl max-w-3xl mx-auto"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            {section.description}
          </p>
        </motion.div>

        {/* 特性网格 - 手机端优先 */}
        <div className="grid gap-8 md:gap-12">
          {section.items?.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="flex flex-col md:flex-row gap-6 items-start"
            >
              {/* 图标 */}
              <div
                className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "oklch(var(--primary) / 0.1)" }}
              >
                <SmartIcon
                  name={item.icon as string}
                  className="w-8 h-8"
                  style={{ color: "oklch(var(--primary))" }}
                />
              </div>

              {/* 内容 */}
              <div className="flex-1">
                <h3
                  className="text-xl md:text-2xl font-bold mb-3"
                  style={{ color: "oklch(var(--foreground))" }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-base md:text-lg leading-relaxed"
                  style={{ color: "oklch(var(--muted-foreground))" }}
                >
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA按钮 */}
        {section.buttons && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-16"
          >
            {section.buttons.map((button, index) => (
              <button
                key={index}
                className="inline-flex items-center gap-3 px-8 py-4 font-bold text-base uppercase tracking-wide rounded-lg transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: "oklch(var(--primary))",
                  color: "oklch(var(--primary-foreground))",
                }}
                onClick={() => {
                  // 简单的错误处理
                  try {
                    window.location.href = button.url || "/ai-video-generator";
                  } catch (error) {
                    console.error("Navigation error:", error);
                  }
                }}
              >
                <span>{button.title}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
