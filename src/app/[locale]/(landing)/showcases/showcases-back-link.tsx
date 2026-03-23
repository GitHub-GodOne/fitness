"use client";

import { Link, useRouter } from "@/core/i18n/navigation";

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
  const router = useRouter();

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      title={title}
      onClick={(event) => {
        if (window.history.length <= 1) {
          return;
        }

        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
