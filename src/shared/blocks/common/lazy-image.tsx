'use client';

import Image from 'next/image';

export function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  placeholderSrc,
  title,
  fill,
  priority,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholderSrc?: string;
  title?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  // 如果 src 为空字符串或未定义，不渲染图片
  if (!src || src.trim() === '') {
    return null;
  }

  const style: React.CSSProperties = {
    ...(className?.includes('w-auto') || className?.includes('w-fit')
      ? { width: 'auto' }
      : {}),
    ...(className?.includes('h-auto') ? { height: 'auto' } : {}),
  };

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        title={title}
        priority={priority}
        sizes={sizes}
        className={className}
        unoptimized={src.startsWith('data:')}
      />
    );
  }

  if (width && height) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        title={title}
        priority={priority}
        sizes={sizes}
        className={className}
        placeholder={placeholderSrc ? 'blur' : 'empty'}
        blurDataURL={placeholderSrc}
        style={style}
        unoptimized={src.startsWith('data:')}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      title={title}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      style={style}
    />
  );
}
