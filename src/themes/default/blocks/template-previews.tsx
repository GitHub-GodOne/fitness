'use client';

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/shared/lib/utils';

interface TemplatePreview {
  src: string;
  alt: string;
  aspectRatio: 'landscape' | 'square' | 'vertical';
}

interface TemplatePreviewRowProps {
  templates: TemplatePreview[];
  direction?: 'left' | 'right';
  speed?: number;
}

function TemplatePreviewRow({ templates, direction = 'left', speed = 30 }: TemplatePreviewRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const positionRef = useRef(0);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const scrollWidth = row.scrollWidth / 2;
    const baseSpeed = speed;

    const animate = () => {
      if (direction === 'left') {
        positionRef.current -= baseSpeed / 60;
        if (Math.abs(positionRef.current) >= scrollWidth) {
          positionRef.current = 0;
        }
      } else {
        positionRef.current += baseSpeed / 60;
        if (positionRef.current >= 0) {
          positionRef.current = -scrollWidth;
        }
      }

      row.style.transform = `translateX(${positionRef.current}px)`;
      animationRef.current = requestAnimationFrame(animate);
    };

    // Set initial position for right direction
    if (direction === 'right') {
      positionRef.current = -scrollWidth;
      row.style.transform = `translateX(${positionRef.current}px)`;
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [direction, speed]);

  // Duplicate templates for seamless loop
  const duplicatedTemplates = [...templates, ...templates, ...templates, ...templates];

  return (
    <div className="relative flex overflow-hidden" style={{ gap: '10px' }}>
      <div
        ref={rowRef}
        className="flex shrink-0"
        style={{ gap: '10px' }}
      >
        {duplicatedTemplates.map((template, index) => (
          <div
            key={index}
            className={cn(
              'relative shrink-0 overflow-hidden rounded-lg shadow-md transition-transform hover:scale-105',
              template.aspectRatio === 'landscape' && 'w-[280px] h-[157px]',
              template.aspectRatio === 'square' && 'w-[200px] h-[200px]',
              template.aspectRatio === 'vertical' && 'w-[157px] h-[280px]'
            )}
          >
            <Image
              src={template.src}
              alt={template.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 200px, 280px"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface TemplatePreviewsProps {
  section: {
    title?: string;
    rows: {
      templates: TemplatePreview[];
      direction?: 'left' | 'right';
      speed?: number;
    }[];
  };
  className?: string;
}

export function TemplatePreviews({ section, className }: TemplatePreviewsProps) {
  return (
    <section className={cn('py-16 overflow-hidden', className)}>
      <div className="space-y-4">
        {section.rows.map((row, index) => (
          <TemplatePreviewRow
            key={index}
            templates={row.templates}
            direction={row.direction}
            speed={row.speed}
          />
        ))}
      </div>
      
      {section.title && (
        <div className="mt-12 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
            {section.title}
          </h2>
        </div>
      )}
    </section>
  );
}

export default TemplatePreviews;
