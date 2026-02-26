"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Button } from "@/shared/components/ui/button";
import { ScrollAnimation } from "@/shared/components/ui/scroll-animation";
import { Section } from "@/shared/types/blocks/landing";

export function Faq({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={`py-8 sm:py-10 md:py-12 lg:py-16 ${className}`}
    >
      <div className={`mx-auto max-w-full px-4 sm:px-6 md:max-w-3xl md:px-8`}>
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
          <div className="mx-auto mt-8 sm:mt-10 md:mt-12 max-w-full">
            <Accordion
              type="single"
              collapsible
              className="bg-primary/5 w-full rounded-xl sm:rounded-2xl p-0.5 sm:p-1 border border-primary/20"
            >
              {section.items?.map((item, idx) => (
                <div className="group" key={idx}>
                  <AccordionItem
                    value={item.question || item.title || ""}
                    className="bg-background/90 peer rounded-lg sm:rounded-xl border-none px-4 sm:px-6 md:px-7 py-1 data-[state=open]:border-none transition-colors duration-200"
                  >
                    <AccordionTrigger className="cursor-pointer text-sm sm:text-base hover:no-underline text-foreground font-medium">
                      {item.question || item.title || ""}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        {item.answer || item.description || ""}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                  <hr className="mx-4 sm:mx-6 md:mx-7 border-dashed border-primary/20 group-last:hidden peer-data-[state=open]:opacity-0" />
                </div>
              ))}
            </Accordion>

            <p
              className="text-muted-foreground text-xs sm:text-sm mt-4 sm:mt-6 px-4 sm:px-6 md:px-8"
              dangerouslySetInnerHTML={{ __html: section.tip || "" }}
            />
          </div>
        </ScrollAnimation>
        {section.buttons && section.buttons.length > 0 && (
          <ScrollAnimation delay={0.4}>
            <div className="mt-8 sm:mt-10 md:mt-12 flex justify-center">
              {section.buttons.map((button, index) => (
                <Button
                  key={index}
                  asChild
                  size="default"
                  className="h-11 sm:h-12 text-sm sm:text-base px-6 sm:px-8 font-semibold shadow-lg hover:shadow-xl transition-all"
                  variant={button.variant || "default"}
                >
                  <Link
                    href={button.url || ""}
                    target={button.target || "_self"}
                  >
                    {button.title}
                  </Link>
                </Button>
              ))}
            </div>
          </ScrollAnimation>
        )}
      </div>
    </section>
  );
}
