import { Link } from "@/core/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Section } from "@/shared/types/blocks/landing";
import { SectionCtaIcon } from "./section-cta-icon";

export function Faq({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={`py-8 sm:py-10 md:py-12 lg:py-16 ${className}`}
    >
      <div className={`mx-auto max-w-full px-4 sm:px-6 md:max-w-3xl md:px-8`}>
        <div className="mx-auto max-w-2xl text-center text-balance">
          <h2 className="text-foreground mb-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 md:mb-10 lg:mb-12">
            {section.description}
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-full sm:mt-10 md:mt-12">
          <div className="bg-primary/5 w-full rounded-xl border border-primary/20 p-0.5 sm:rounded-2xl sm:p-1">
            {section.items?.map((item, idx) => (
              <div className="group" key={idx}>
                <details className="bg-background/90 rounded-lg px-4 py-1 sm:rounded-xl sm:px-6 md:px-7">
                  <summary className="text-foreground cursor-pointer list-none py-4 text-sm font-medium marker:hidden sm:text-base">
                    <span>{item.question || item.title || ""}</span>
                  </summary>
                  <div className="pb-4">
                    <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
                      {item.answer || item.description || ""}
                    </p>
                  </div>
                </details>
                <hr className="mx-4 border-dashed border-primary/20 group-last:hidden sm:mx-6 md:mx-7" />
              </div>
            ))}
          </div>

          <p
            className="text-muted-foreground mt-4 px-4 text-xs sm:mt-6 sm:px-6 sm:text-sm md:px-8"
            dangerouslySetInnerHTML={{ __html: section.tip || "" }}
          />
        </div>
        {section.buttons && section.buttons.length > 0 && (
          <div className="mt-8 flex justify-center sm:mt-10 md:mt-12">
            {section.buttons.map((button, index) => (
              <Button
                key={index}
                asChild
                variant={button.variant || "default"}
                size="lg"
                className="h-auto min-h-12 max-w-full rounded-full px-4 py-3 text-sm sm:px-10 sm:text-base"
              >
                <Link href={button.url || ""} target={button.target || "_self"}>
                  <SectionCtaIcon
                    section="faq"
                    className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2"
                  />
                  <span>{button.title}</span>
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
