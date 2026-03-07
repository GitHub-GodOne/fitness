"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

interface AuthoritySection extends Section {
  additional_text?: string;
  image?: {
    src: string;
    alt: string;
  };
}

export function Authority({
  section,
  className,
}: {
  section: AuthoritySection;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={cn(
        "relative py-16 md:py-24 lg:py-32 overflow-hidden",
        section.className,
        className,
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-7xl mx-auto">
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight">
              {section.title}
            </h2>

            {/* Main description */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {section.description}
            </p>

            {/* Additional text */}
            {section.additional_text && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {section.additional_text}
              </p>
            )}

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 pt-4">
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-2xl">🏥</span>
                <span className="text-sm font-semibold text-foreground">
                  Medical Experts
                </span>
              </motion.div>
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-2xl">🔬</span>
                <span className="text-sm font-semibold text-foreground">
                  30+ Years Research
                </span>
              </motion.div>
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-2xl">✅</span>
                <span className="text-sm font-semibold text-foreground">
                  Clinically Validated
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-foreground/10">
              {section.image ? (
                <Image
                  src={section.image.src}
                  alt={section.image.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <span className="text-6xl">🩺</span>
                </div>
              )}

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>

            {/* Decorative element */}
            <motion.div
              className="absolute -z-10 -bottom-4 -right-4 w-72 h-72 rounded-full opacity-20 blur-3xl bg-gradient-to-br from-primary to-secondary"
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
