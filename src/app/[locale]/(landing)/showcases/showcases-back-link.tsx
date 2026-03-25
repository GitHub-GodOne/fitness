"use client";

import { Link } from "@/core/i18n/navigation";

export function ShowcasesBackLink({
  href,
  className,
  ariaLabel,
  title,
  children,
}: {
  href: string;
  className?: string;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </Link>
  );
}
