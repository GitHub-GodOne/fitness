"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

const AccordionIdPrefixContext = React.createContext<string | undefined>(
  undefined,
);
const AccordionItemIdContext = React.createContext<string | undefined>(
  undefined,
);

function sanitizeAccordionId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Accordion({
  idPrefix,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root> & {
  idPrefix?: string;
}) {
  return (
    <AccordionIdPrefixContext.Provider value={idPrefix}>
      <AccordionPrimitive.Root data-slot="accordion" {...props} />
    </AccordionIdPrefixContext.Provider>
  );
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  const idPrefix = React.useContext(AccordionIdPrefixContext);
  const sanitizedValue =
    typeof props.value === "string"
      ? sanitizeAccordionId(props.value)
      : undefined;
  const itemId =
    idPrefix && sanitizedValue
      ? `${sanitizeAccordionId(idPrefix)}-${sanitizedValue}`
      : undefined;

  return (
    <AccordionItemIdContext.Provider value={itemId}>
      <AccordionPrimitive.Item
        data-slot="accordion-item"
        className={cn("border-b last:border-b-0", className)}
        {...props}
      />
    </AccordionItemIdContext.Provider>
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  const itemId = React.useContext(AccordionItemIdContext);
  const triggerId = itemId ? `${itemId}-trigger` : props.id;
  const contentId = itemId ? `${itemId}-content` : props["aria-controls"];

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        id={triggerId}
        aria-controls={contentId}
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  const itemId = React.useContext(AccordionItemIdContext);
  const contentId = itemId ? `${itemId}-content` : props.id;
  const triggerId = itemId ? `${itemId}-trigger` : props["aria-labelledby"];

  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      id={contentId}
      aria-labelledby={triggerId}
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
