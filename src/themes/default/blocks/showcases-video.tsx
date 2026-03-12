"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play } from "lucide-react";
import { Section } from "@/shared/types/blocks/landing";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";

interface VideoItem {
  title: string;
  description?: string;
  video?: {
    src: string;
  };
}

export function ShowcasesVideo({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const items = (section.items as VideoItem[]) || [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <section
      id={section.id || "showcases"}
      className={cn("py-16 md:py-24", section.className, className)}
    >
      {/* Header */}
      <motion.div
        className="container mb-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {section.sr_only_title && (
          <h1 className="sr-only">{section.sr_only_title}</h1>
        )}
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{section.title}</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {section.description}
        </p>
      </motion.div>

      {/* Video Grid */}
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => (
            <motion.div
              key={index}
              className="group relative rounded-xl overflow-hidden bg-card border hover:shadow-lg transition-shadow cursor-pointer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              onClick={() => setSelectedIndex(index)}
            >
              {/* Video Thumbnail */}
              <div className="aspect-video relative bg-muted">
                {item.video?.src ? (
                  <video
                    src={item.video.src}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                    <span className="text-4xl">🎬</span>
                  </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-primary ml-1" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Full Screen Video Modal */}
      <AnimatePresence>
        {selectedIndex !== null && items[selectedIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 z-50 text-white/70 hover:text-white transition-colors"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="w-8 h-8" />
            </button>

            {/* Video Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative rounded-lg overflow-hidden">
                <video
                  src={items[selectedIndex].video?.src}
                  controls
                  autoPlay
                  className="w-full h-auto max-h-[80vh]"
                />
              </div>

              {/* Video Info */}
              <div className="mt-4 text-center">
                <h3 className="text-white text-xl font-semibold">
                  {items[selectedIndex].title}
                </h3>
                {items[selectedIndex].description && (
                  <p className="text-white/70 mt-2">
                    {items[selectedIndex].description}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
