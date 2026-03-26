import Image from 'next/image';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function BrandLogo({
  brand,
  className,
  logoClassName,
  titleClassName,
}: {
  brand: BrandType;
  className?: string;
  logoClassName?: string;
  titleClassName?: string;
}) {
  return (
    <Link
      href={brand.url || ''}
      target={brand.target || '_self'}
      className={cn('flex items-center gap-3', brand.className, className)}
    >
      {brand.logo && (
        <Image
          src={brand.logo.src}
          alt={brand.title ? '' : brand.logo.alt || ''}
          width={brand.logo.width || 80}
          height={brand.logo.height || 80}
          className={cn('h-8 w-auto rounded-lg', logoClassName)}
          unoptimized={brand.logo.src.startsWith('http')}
        />
      )}
      {brand.title && (
        <span className="whitespace-nowrap text-sm font-medium text-foreground sm:text-lg">
          {brand.title}
        </span>
      )}
    </Link>
  );
}
