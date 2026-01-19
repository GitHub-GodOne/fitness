'use client';

import { ArrowBigRight } from 'lucide-react';

import { SmartIcon } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';
import { Link } from '@/core/i18n/navigation';

export function FeaturesStep({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={cn('py-8 sm:py-10 md:py-12 lg:py-16', section.className, className)}
    >
      <div className="m-4 rounded-[2rem]">
        <div className="@container relative container px-4 sm:px-6">
          <ScrollAnimation>
            <div className="mx-auto max-w-3xl text-center">
              {section.label && <span className="text-primary text-sm sm:text-base">{section.label}</span>}
              <h2 className="text-foreground mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl font-semibold">
                {section.title}
              </h2>
              <p className="text-muted-foreground mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-balance px-4">
                {section.description}
              </p>
            </div>
          </ScrollAnimation>

          <ScrollAnimation delay={0.2}>
            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col items-center gap-4 sm:gap-6">
              {section.items?.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 sm:gap-4 text-left max-w-md w-full px-4"
                >
                  <span className="flex size-8 sm:size-10 items-center justify-center rounded-full bg-primary/10 text-base sm:text-lg font-bold text-primary shrink-0">
                    {idx + 1}
                  </span>
                  <h3 className="text-foreground text-base sm:text-lg md:text-xl font-semibold">
                    {item.title}
                  </h3>
                </div>
              ))}
            </div>
          </ScrollAnimation>

          {/* CTA Buttons */}
          {section.buttons && section.buttons.length > 0 && (
            <ScrollAnimation delay={0.4}>
              <div className="mt-8 sm:mt-10 md:mt-12 flex justify-center">
                {section.buttons.map((button, index) => (
                  <Button
                    key={index}
                    asChild
                    size="default"
                    variant={button.variant || 'default'}
                    className="h-11 text-sm font-semibold sm:h-12 sm:text-base"
                  >
                    <Link href={button.url || ''} target={button.target || '_self'}>
                      {button.title}
                    </Link>
                  </Button>
                ))}
              </div>
            </ScrollAnimation>
          )}
        </div>
      </div>
    </section>
  );
}
