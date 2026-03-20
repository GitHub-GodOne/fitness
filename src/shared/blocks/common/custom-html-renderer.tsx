"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/shared/lib/utils";

type CustomHtmlRendererProps = {
  html: string;
  className?: string;
};

function cloneScript(source: HTMLScriptElement) {
  const nextScript = document.createElement("script");

  Array.from(source.attributes).forEach((attribute) => {
    nextScript.setAttribute(attribute.name, attribute.value);
  });

  nextScript.setAttribute("data-admin-html-activated", "true");

  if (
    source.src &&
    !source.hasAttribute("async") &&
    !source.hasAttribute("defer") &&
    source.type !== "module"
  ) {
    nextScript.async = false;
  }

  if (source.textContent) {
    nextScript.textContent = source.textContent;
  }

  return nextScript;
}

function cloneHeadNode(source: Element) {
  const tagName = source.tagName.toLowerCase();

  if (tagName === "style") {
    const style = document.createElement("style");

    Array.from(source.attributes).forEach((attribute) => {
      style.setAttribute(attribute.name, attribute.value);
    });

    style.textContent = source.textContent;
    return style;
  }

  if (tagName === "link") {
    const link = document.createElement("link");

    Array.from(source.attributes).forEach((attribute) => {
      link.setAttribute(attribute.name, attribute.value);
    });

    return link;
  }

  if (tagName === "script") {
    return cloneScript(source as HTMLScriptElement);
  }

  return null;
}

async function executeScriptsSequentially(
  scripts: HTMLScriptElement[],
  target: ParentNode,
  isCancelled: () => boolean,
) {
  for (const sourceScript of scripts) {
    if (isCancelled()) {
      return;
    }

    const nextScript = cloneScript(sourceScript);

    const completion = new Promise<void>((resolve) => {
      if (nextScript.src) {
        nextScript.addEventListener("load", () => resolve(), { once: true });
        nextScript.addEventListener("error", () => resolve(), { once: true });
      } else {
        resolve();
      }
    });

    target.appendChild(nextScript);
    await completion;
  }
}

export function CustomHtmlRenderer({
  html,
  className,
}: CustomHtmlRendererProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    if (!shadowRootRef.current) {
      shadowRootRef.current = host.attachShadow({ mode: "open" });
    }

    const shadowRoot = shadowRootRef.current;
    if (!shadowRoot) {
      return;
    }

    let cancelled = false;

    const parsed = new DOMParser().parseFromString(html, "text/html");
    const body = parsed.body;
    const bodyClasses = body.className.trim();
    const bodyAttributes = Array.from(body.attributes).filter(
      (attribute) => attribute.name !== "class",
    );
    const headChildren = Array.from(parsed.head.children);
    const headScripts = headChildren
      .filter((node) => node.tagName.toLowerCase() === "script")
      .map((node) => node as HTMLScriptElement);
    const headResources = headChildren.filter(
      (node) => node.tagName.toLowerCase() !== "script",
    );
    const bodyScripts = Array.from(
      body.querySelectorAll<HTMLScriptElement>("script"),
    );

    shadowRoot.replaceChildren();

    const shellStyle = document.createElement("style");
    shellStyle.textContent = `
      :host {
        display: block;
        min-width: 0;
        color: inherit;
        font: inherit;
      }
    `;
    shadowRoot.appendChild(shellStyle);

    headResources.forEach((resource) => {
      const node = cloneHeadNode(resource);
      if (node) {
        shadowRoot.appendChild(node);
      }
    });

    const wrapper = document.createElement("div");
    if (bodyClasses) {
      wrapper.className = bodyClasses;
    }

    bodyAttributes.forEach((attribute) => {
      wrapper.setAttribute(attribute.name, attribute.value);
    });

    wrapper.innerHTML = body.innerHTML;
    shadowRoot.appendChild(wrapper);

    const bodyScriptPlaceholders = Array.from(
      wrapper.querySelectorAll<HTMLScriptElement>("script"),
    );

    void (async () => {
      await executeScriptsSequentially(headScripts, shadowRoot, () => cancelled);

      for (let index = 0; index < bodyScriptPlaceholders.length; index += 1) {
        if (cancelled) {
          return;
        }

        const sourceScript = bodyScripts[index];
        const placeholder = bodyScriptPlaceholders[index];
        if (!sourceScript || !placeholder?.parentNode) {
          continue;
        }

        const nextScript = cloneScript(sourceScript);
        const completion = new Promise<void>((resolve) => {
          if (nextScript.src) {
            nextScript.addEventListener("load", () => resolve(), {
              once: true,
            });
            nextScript.addEventListener("error", () => resolve(), {
              once: true,
            });
          } else {
            resolve();
          }
        });

        placeholder.parentNode.replaceChild(nextScript, placeholder);
        await completion;
      }
    })();

    return () => {
      cancelled = true;
      shadowRoot.replaceChildren();
    };
  }, [html]);

  return <div ref={hostRef} className={cn(className)} />;
}
