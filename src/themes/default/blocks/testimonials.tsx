"use client";

import Link from "next/link";
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
  const TestimonialCard = ({ item }: { item: SectionItem }) => {
    return (
      <div className="bg-card/25 ring-foreground/[0.07] flex flex-col justify-end gap-4 sm:gap-6 rounded-(--radius) border border-transparent p-4 sm:p-6 md:p-8 ring-1">
        <p className='text-foreground text-sm sm:text-base self-end text-balance before:mr-1 before:content-["\201C"] after:ml-1 after:content-["\201D"]'>
          {item.quote || item.description}
        </p>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="ring-foreground/10 aspect-square size-8 sm:size-9 overflow-hidden rounded-lg border border-transparent shadow-md ring-1 shadow-black/15">
            <LazyImage
              src={item.image?.src || item.avatar?.src || ""}
              alt={item.image?.alt || item.avatar?.alt || item.name || ""}
              className="h-full w-full object-cover"
            />
          </div>
          <h3 className="sr-only">
            {item.name}, {item.role || item.title}
          </h3>
          <div className="space-y-px">
            <p className="text-xs sm:text-sm font-medium">{item.name} </p>
            <p className="text-muted-foreground text-[10px] sm:text-xs">
              {item.role || item.title}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      id={section.id}
      className={`py-8 sm:py-10 md:py-12 lg:py-16 ${section.className} ${className}`}
    >
      <div className="container px-4 sm:px-6">
        <ScrollAnimation>
          <div className="mx-auto max-w-2xl text-center text-balance">
            <h2 className="text-foreground mb-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {section.title}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-6 md:mb-10 lg:mb-12">
              {section.description}
            </p>
          </div>
        </ScrollAnimation>
        <ScrollAnimation delay={0.2}>
          <div className="border-border/50 relative rounded-(--radius)">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-px lg:*:nth-1:rounded-t-none lg:*:nth-2:rounded-tl-none lg:*:nth-2:rounded-br-none lg:*:nth-3:rounded-l-none lg:*:nth-4:rounded-r-none lg:*:nth-5:rounded-tl-none lg:*:nth-5:rounded-br-none lg:*:nth-6:rounded-b-none">
              {section.items?.map((item, index) => (
                <TestimonialCard key={index} item={item} />
              ))}
            </div>
          </div>
        </ScrollAnimation>
        {section.buttons && section.buttons.length > 0 && (
          <ScrollAnimation delay={0.4}>
            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
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
                    size="default"
                    className={cn(
                      "h-auto min-h-11 sm:min-h-12 text-sm sm:text-base px-4 sm:px-6 md:px-8 font-semibold shadow-lg hover:shadow-xl transition-all",
                      "flex items-center justify-center gap-2 whitespace-normal break-words text-center",
                      "w-full sm:w-auto max-w-full py-2.5 sm:py-3",
                    )}
                    variant={safeVariant}
                  >
                    <Link
                      href={btn.url || ""}
                      target={btn.target || "_self"}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      {btn.icon && (
                        <SmartIcon
                          name={btn.icon}
                          className="h-4 w-4 sm:h-5 sm:w-5 shrink-0"
                        />
                      )}
                      <span className="break-words overflow-wrap-anywhere">
                        {btn.title}
                      </span>
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
