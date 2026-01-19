'use client';

import Link from 'next/link';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

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
      className={cn('py-8 sm:py-10 md:py-12 lg:py-16', section.className, className)}
    >
      <div className={`container px-4 sm:px-6 space-y-6 sm:space-y-8 md:space-y-12 lg:space-y-16`}>
        <ScrollAnimation>
          <div className="mx-auto max-w-4xl text-center text-balance">
            <h2 className="text-foreground mb-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
              {section.title}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-6 md:mb-10 lg:mb-12 px-4">
              {section.description}
            </p>
          </div>
        </ScrollAnimation>

        <ScrollAnimation delay={0.2}>
          <div className="relative mx-auto grid divide-x divide-y border *:p-6 sm:*:p-8 md:*:p-10 lg:*:p-12 sm:grid-cols-2 lg:grid-cols-3">
            {section.items?.map((item, idx) => (
              <div className="space-y-2 sm:space-y-3" key={idx}>
                <div className="flex items-center gap-2">
                  <SmartIcon name={item.icon as string} size={20} className="sm:w-6 sm:h-6" />
                  <h3 className="text-xs sm:text-sm font-medium">{item.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </ScrollAnimation>

        {/* Quote section */}
        {(section as any).quote && (
          <ScrollAnimation delay={0.4}>
            <div className="mx-auto mt-10 sm:mt-12 md:mt-16 max-w-3xl text-center px-4">
              <blockquote className="text-base sm:text-lg md:text-xl lg:text-2xl font-serif italic text-foreground/80 leading-relaxed">
                "{(section as any).quote.text}"
              </blockquote>
              <cite className="mt-3 sm:mt-4 block text-xs sm:text-sm text-muted-foreground not-italic">
                — {(section as any).quote.source}
              </cite>
            </div>
          </ScrollAnimation>
        )}

        {/* Tip section */}
        {section.tip && (
          <ScrollAnimation delay={0.5}>
            <div className="mx-auto mt-8 sm:mt-10 md:mt-12 max-w-2xl text-center px-4">
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground font-light">
                {section.tip}
              </p>
            </div>
          </ScrollAnimation>
        )}

        {/* Buttons */}
        {section.buttons && section.buttons.length > 0 && (
          <ScrollAnimation delay={0.6}>
            <div className="mt-8 sm:mt-10 md:mt-12 flex justify-center">
              {section.buttons.map((button, index) => (
                <Button
                  key={index}
                  asChild
                  size="default"
                  className="h-11 sm:h-12 text-sm sm:text-base px-6 sm:px-8 font-semibold shadow-lg hover:shadow-xl transition-all"
                  variant={button.variant || 'default'}
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
    </section>
  );
}
