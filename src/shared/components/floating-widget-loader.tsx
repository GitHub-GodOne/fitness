"use client";

import dynamic from "next/dynamic";

const FloatingWidget = dynamic(
  () =>
    import("@/shared/components/floating-widget").then(
      (module) => module.FloatingWidget,
    ),
  { ssr: false },
);

export function FloatingWidgetLoader() {
  return <FloatingWidget />;
}
