"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { LazyImage, SmartIcon } from "@/shared/blocks/common";
import { cn } from "@/shared/lib/utils";
import { Section } from "@/shared/types/blocks/landing";

export function FeaturesGrid({ section }: { section: Section }) {
  return (
    <section
      id={section.id || section.name}
      className={cn("py-16 md:py-24", section.className)}
    >
      <div className="container mx-auto max-w-4xl px-4">
        <motion.h2
          className="text-3xl md:text-4xl font-semibold text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {section.title}
        </motion.h2>

        {section.description && (
          <motion.p
            className="text-center text-muted-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {section.description}
          </motion.p>
        )}

        <motion.div
          className="grid grid-cols-3 gap-4 mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {section.items?.map((item, index) => (
            <motion.div
              key={item.title}
              className="relative rounded-xl overflow-hidden h-32 md:h-40 cursor-pointer group"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              whileHover={{ scale: 1.05 }}
            >
              <LazyImage
                src={item.image?.src || item.image?.src || ""}
                alt={item.image?.alt || item.title || ""}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <h3 className="text-white text-sm md:text-base font-semibold text-center">
                  {item.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {section.buttons && section.buttons.length > 0 && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {section.buttons.map((button) => (
              <Link key={button.title} href={button.url || "#"}>
                <Button className="h-12 px-8 text-base font-semibold rounded-full w-auto sm:w-auto">
                  {button.icon && (
                    <SmartIcon
                      name={button.icon as string}
                      className="mr-2 h-5 w-5"
                    />
                  )}
                  {button.title}
                </Button>
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
