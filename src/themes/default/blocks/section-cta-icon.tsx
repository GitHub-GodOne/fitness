import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
  Clapperboard,
  Gift,
  Grid3X3,
  Image,
  Layers3,
  ListChecks,
  MessageSquare,
  PenTool,
  Play,
  Rocket,
  Rows3,
  Sparkles,
  Workflow,
} from "lucide-react";

import { cn } from "@/shared/lib/utils";

const sectionCreateIcons = {
  hero: Sparkles,
  cta: Rocket,
  features: Layers3,
  featuresList: ListChecks,
  featuresGrid: Grid3X3,
  featuresAlternating: Rows3,
  featuresStep: Workflow,
  faq: CircleHelp,
  founderLetter: PenTool,
  heroVideo: Play,
  heroComfort: Gift,
  heroLumen5: Clapperboard,
  testimonials: MessageSquare,
  showcasesFlow: Image,
} satisfies Record<string, LucideIcon>;

export type SectionCtaIconName = keyof typeof sectionCreateIcons;

export function SectionCtaIcon({
  section,
  className,
}: {
  section: SectionCtaIconName;
  className?: string;
}) {
  const Icon = sectionCreateIcons[section];

  return <Icon className={cn("shrink-0", className)} />;
}
