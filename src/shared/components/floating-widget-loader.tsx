"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const FloatingWidget = dynamic(
  () =>
    import("@/shared/components/floating-widget").then(
      (module) => module.FloatingWidget,
    ),
  { ssr: false },
);

export function FloatingWidgetLoader() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const onIdle = () => setShouldRender(true);

    if (typeof window === "undefined") {
      return;
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(onIdle, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(onIdle, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  if (!shouldRender) {
    return null;
  }

  return <FloatingWidget />;
}
