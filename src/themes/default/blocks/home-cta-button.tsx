"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { SectionCtaIcon, type SectionCtaIconName } from "./section-cta-icon";

export function HomeCtaButton({
  title,
  onClick,
  sectionIcon,
  leftIcon,
  className,
}: {
  title: string;
  onClick?: () => void;
  sectionIcon: SectionCtaIconName;
  leftIcon?: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="default"
      size="lg"
      onClick={onClick}
      className={cn(
        "self-center flex h-auto min-h-12 w-fit max-w-full cursor-pointer items-center justify-center gap-0 whitespace-nowrap px-2.5 py-2.5 has-[>svg]:px-2.5 sm:h-12 sm:px-10 sm:py-3 sm:has-[>svg]:px-10",
        "rounded-full text-[9px] font-semibold leading-none shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl sm:text-sm",
        className,
      )}
    >
      {leftIcon ?? (
        <SectionCtaIcon
          section={sectionIcon}
          className="mr-1.5 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4"
        />
      )}
      <span className="whitespace-nowrap text-[9px] leading-none sm:text-xs lg:text-sm">
        {title}
      </span>
      <ArrowRight className="ml-1.5 h-3.5 w-3.5 shrink-0 sm:ml-2 sm:h-4 sm:w-4" />
    </Button>
  );
}
