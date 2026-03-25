"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";

interface ScrollAnimationProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  stagger?: boolean;
}

export function ScrollAnimation({
  children,
  className = "",
  delay = 0,
  direction = "up",
  stagger = false,
}: ScrollAnimationProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setIsInView(true);
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -50px 0px",
        threshold: 0.1,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const getInitialTransform = () => {
    switch (direction) {
      case "up":
        return "translate3d(0, 30px, 0)";
      case "down":
        return "translate3d(0, -30px, 0)";
      case "left":
        return "translate3d(30px, 0, 0)";
      case "right":
        return "translate3d(-30px, 0, 0)";
      default:
        return "translate3d(0, 30px, 0)";
    }
  };

  const sharedStyle: React.CSSProperties = {
    opacity: isInView ? 1 : 0,
    transform: isInView ? "translate3d(0, 0, 0)" : getInitialTransform(),
    filter: isInView ? "blur(0px)" : "blur(4px)",
    transitionDelay: `${delay}s`,
    transitionDuration: "0.6s",
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    transitionProperty: "opacity, transform, filter",
  };

  if (stagger) {
    return (
      <div
        ref={ref}
        className={className}
        style={sharedStyle}
      >
        {React.Children.map(children, (child, index) => (
          <div
            style={{
              ...sharedStyle,
              transitionDelay: `${delay + index * 0.1}s`,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={sharedStyle}
    >
      {children}
    </div>
  );
}
