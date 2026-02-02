"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight } from "lucide-react";
import { SmartIcon } from "@/shared/blocks/common/smart-icon";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";
import { Link } from "@/core/i18n/navigation";

export function Features({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const items = section.items || [];

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
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
          >
            <Zap className="w-4 h-4" />
            Features
          </motion.span>
          <h2 className="text-foreground text-3xl md:text-4xl lg:text-5xl font-bold mb-4  text-muted-foreground">
            {section.title}
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto  text-muted-foreground">
            {section.description}
          </p>
        </motion.div>

        {/* 桌面端：Tab横向布局 */}
        <div className="hidden md:block">
          {/* Tab导航 */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap  text-muted-foreground">
            {items.map((item, idx) => (
              <motion.button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={cn(
                  "px-6 py-3 rounded-full text-sm font-medium transition-all duration-300",
                  activeTab === idx
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-card text-foreground hover:bg-muted border border-border",
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center gap-2  text-muted-foreground">
                  {item.icon && (
                    <SmartIcon name={item.icon as string} className="w-4 h-4" />
                  )}
                  {item.title}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Tab内容卡片 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-card border border-border rounded-3xl p-8 md:p-12 relative overflow-hidden">
                {/* 背景装饰 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row gap-8 items-center">
                  {/* 图标 */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex-shrink-0"
                  >
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center relative">
                      {items[activeTab]?.icon && (
                        <SmartIcon
                          name={items[activeTab].icon as string}
                          className="w-12 h-12 text-primary"
                        />
                      )}
                      {/* 光晕效果 */}
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl"
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
                  </motion.div>

                  {/* 内容 */}
                  <div className="flex-1 text-center md:text-left text-muted-foreground">
                    <motion.h3
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-foreground text-2xl md:text-3xl font-bold mb-4"
                    >
                      {items[activeTab]?.title}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-muted-foreground text-lg leading-relaxed mb-6"
                    >
                      {items[activeTab]?.description}
                    </motion.p>

                    {/* 每个Tab下的按钮 */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <Button asChild size="lg" className="group">
                        <Link
                          href="/ai-video-generator"
                          className="flex items-center gap-2  text-muted-foreground"
                        >
                          <span>Try It Now</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 手机端：纵向滚动加载卡片 */}
        <div className="md:hidden space-y-6  text-muted-foreground">
          {items.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden"
            >
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative">
                {/* 步骤编号 */}
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                  {idx + 1}
                </div>

                {/* 图标 */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4 ml-6">
                  {item.icon && (
                    <SmartIcon
                      name={item.icon as string}
                      className="w-8 h-8 text-primary"
                    />
                  )}
                </div>

                {/* 内容 */}
                <h3 className="text-foreground text-xl font-bold mb-2  text-muted-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-base leading-relaxed mb-4  text-muted-foreground">
                  {item.description}
                </p>

                {/* 每个卡片下的按钮 */}
                <Button asChild size="sm" variant="outline" className="group">
                  <Link
                    href="/ai-video-generator"
                    className="flex items-center gap-2"
                  >
                    <span>Learn More</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 底部CTA按钮 */}
        {section.buttons && section.buttons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12 md:mt-16  text-muted-foreground"
          >
            {section.buttons.map((button, index) => (
              <Button key={index} asChild size="lg" className="group">
                <Link
                  href={button.url || "/ai-video-generator"}
                  className="flex items-center gap-2"
                >
                  {button.icon && (
                    <SmartIcon
                      name={button.icon as string}
                      className="w-5 h-5"
                    />
                  )}
                  <span>{button.title}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
