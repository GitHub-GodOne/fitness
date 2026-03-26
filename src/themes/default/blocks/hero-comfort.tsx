'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';
import { SectionCtaIcon } from './section-cta-icon';

export function HeroComfort({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const sectionEl = sectionRef.current;
    if (sectionEl) {
      sectionEl.addEventListener('mousemove', handleMouseMove);
      sectionEl.addEventListener('mouseenter', () => setIsHovering(true));
      sectionEl.addEventListener('mouseleave', () => setIsHovering(false));
    }

    return () => {
      if (sectionEl) {
        sectionEl.removeEventListener('mousemove', handleMouseMove);
        sectionEl.removeEventListener('mouseenter', () => setIsHovering(true));
        sectionEl.removeEventListener('mouseleave', () => setIsHovering(false));
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id={section.id}
      className={cn(
        'relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden',
        'bg-gradient-to-b from-amber-50/25 via-amber-50/15 to-amber-50/10',
        'dark:from-amber-950/15 dark:via-amber-950/10 dark:to-amber-950/5',
        className
      )}
    >
      {/* 背景光晕效果 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 缓慢浮动的光点动画 */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/20 dark:bg-amber-800/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-200/15 dark:bg-amber-800/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* 鼠标跟随的光亮效果 */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out',
            isHovering ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255, 248, 220, 0.3), rgba(255, 248, 220, 0.1) 30%, transparent 60%)`,
          }}
        />
      </div>

      {/* 背景图片 */}
      {section.background_image?.src && (
        <div className="absolute inset-0 -z-10 hidden h-full w-full overflow-hidden md:block">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/30 via-transparent to-amber-50/30 dark:from-amber-950/20 dark:via-transparent dark:to-amber-950/20" />
          <Image
            src={section.background_image.src}
            alt={section.background_image.alt || ''}
            className="object-cover opacity-30 dark:opacity-20"
            fill
            loading="eager"
            sizes="100vw"
            quality={70}
            unoptimized={section.background_image.src.startsWith('http')}
            style={{
              objectPosition: 'center center',
            }}
          />
        </div>
      )}

      {/* 主要内容 */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 ease-out">
          {/* 主标题 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-light tracking-tight mb-4 sm:mb-6 px-2">
            <span className="block bg-gradient-to-r from-amber-700 via-amber-600 to-olive-700 dark:from-amber-400 dark:via-amber-300 dark:to-olive-400 bg-clip-text text-transparent break-words hyphens-auto">
              {section.title || 'Fear Not, For I Am With You'}
            </span>
            {/* 优雅的下划线装饰 */}
            <span className="block mt-3 sm:mt-4 mx-auto w-24 sm:w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent dark:via-amber-500" />
          </h1>

          {/* 副标题 */}
          <p
            className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-amber-900/80 dark:text-amber-200/80 font-light max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-12 leading-relaxed px-3 sm:px-4 break-words hyphens-auto overflow-wrap-anywhere"
            style={{ animationDelay: '120ms' }}
            dangerouslySetInnerHTML={{ __html: section.description || '' }}
          />

          {/* CTA 按钮 */}
          {section.buttons && section.buttons.length > 0 && (
            <div
              className="animate-in fade-in slide-in-from-bottom-4 flex w-full items-center justify-center gap-3 px-2 text-center duration-700 sm:gap-4"
              style={{ animationDelay: '240ms' }}
            >
              {section.buttons.map((button, idx) => (
                <Button
                  key={idx}
                  asChild
                  size="lg"
                  className={cn(
                    'group relative mx-auto !flex h-auto min-h-11 w-fit max-w-full shrink-0 min-w-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-2.5 text-[10px] font-medium leading-none sm:px-6 sm:py-4 sm:text-sm md:px-8 md:py-6 md:text-base lg:text-lg',
                    'bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700',
                    'text-white shadow-lg shadow-amber-500/30 dark:shadow-amber-600/20',
                    'hover:shadow-xl hover:shadow-amber-500/40 dark:hover:shadow-amber-600/30',
                    'hover:scale-105 active:scale-100',
                    'transition-all duration-300 ease-out',
                    'border border-amber-400/20 dark:border-amber-500/30',
                  )}
                >
                  <Link
                    href={button.url ?? '/pricing'}
                    target={button.target ?? '_self'}
                    className="inline-flex items-center justify-center"
                  >
                    <span className="inline-flex items-center justify-center">
                      <SectionCtaIcon
                        section="heroComfort"
                        className="mr-2 h-5 w-5 shrink-0"
                      />
                      {button.icon && typeof button.icon === 'string' && (
                        <span className="mr-2 text-lg transition-transform duration-300 group-hover:scale-110 sm:text-xl md:text-2xl">{button.icon}</span>
                      )}
                      <span className="whitespace-nowrap text-center leading-none">
                        {button.title}
                      </span>
                    </span>
                    {/* 按钮光晕效果 */}
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400/0 via-amber-300/20 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                  </Link>
                </Button>
              ))}
            </div>
          )}

          {/* 提示文字 */}
          {section.tip && (
            <p
              className="animate-in fade-in mt-6 sm:mt-8 text-xs sm:text-sm text-amber-700/70 dark:text-amber-300/70 font-light px-2 break-words duration-700"
              style={{ animationDelay: '360ms' }}
            >
              {section.tip}
            </p>
          )}
        </div>
      </div>

      {/* 底部装饰波浪 */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
