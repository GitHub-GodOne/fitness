import type { CSSProperties } from 'react';
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

function TemplatePreviewCards({
  templates,
}: {
  templates: TemplatePreview[];
}) {
  return (
    <>
      {templates.map((template, index) => (
        <div
          key={`${template.src}-${index}`}
          className={cn(
            'relative shrink-0 overflow-hidden rounded-lg shadow-md transition-transform hover:scale-[1.02]',
            template.aspectRatio === 'landscape' && 'h-[157px] w-[280px]',
            template.aspectRatio === 'square' && 'h-[200px] w-[200px]',
            template.aspectRatio === 'vertical' && 'h-[280px] w-[157px]'
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
    </>
  );
}

function TemplatePreviewRow({
  templates,
  direction = 'left',
  speed = 30,
}: TemplatePreviewRowProps) {
  const animationDirection = direction === 'right' ? 'reverse' : 'normal';
  const animationDuration = `${Math.max(speed, 12)}s`;

  return (
    <div className="relative flex overflow-hidden" style={{ '--gap': '10px' } as CSSProperties}>
      <div
        className="flex w-max shrink-0 animate-marquee"
        style={{
          gap: '10px',
          animationDirection,
          animationDuration,
        }}
      >
        <TemplatePreviewCards templates={templates} />
        <div aria-hidden="true" className="flex" style={{ gap: '10px' }}>
          <TemplatePreviewCards templates={templates} />
        </div>
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
