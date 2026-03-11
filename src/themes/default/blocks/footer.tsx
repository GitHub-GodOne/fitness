"use client";

import { useState } from "react";
import { Link } from "@/core/i18n/navigation";
import {
  BrandLogo,
  BuiltWith,
  Copyright,
  LocaleSelector,
  ThemeToggler,
} from "@/shared/blocks/common";
import { FeedbackDialog } from "@/shared/blocks/common/feedback-dialog";
import { SmartIcon } from "@/shared/blocks/common/smart-icon";
import { ThemeSwitcher } from "@/shared/components/theme-switcher";
import { NavItem } from "@/shared/types/blocks/common";
import { Footer as FooterType } from "@/shared/types/blocks/landing";

export function Footer({ footer }: { footer: FooterType }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const feedbackLabels = (footer as any).feedback_labels;

  const isFeedbackLink = (url?: string) =>
    url?.startsWith("mailto:") || false;

  return (
    <footer
      id={footer.id}
      className={`py-8 sm:py-8 ${footer.className || ""} overflow-x-hidden`}
    >
      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        labels={feedbackLabels}
      />

      <div className="container space-y-8 overflow-x-hidden">
        <div className="grid min-w-0 gap-12 md:grid-cols-5">
          <div className="min-w-0 space-y-4 break-words md:col-span-2 md:space-y-6">
            {footer.brand ? <BrandLogo brand={footer.brand} /> : null}

            {footer.brand?.description ? (
              <p
                className="text-muted-foreground text-sm text-balance break-words"
                dangerouslySetInnerHTML={{ __html: footer.brand.description }}
              />
            ) : null}
          </div>

          <div className="col-span-3 grid min-w-0 gap-6 sm:grid-cols-3">
            {footer.nav?.items.map((item, idx) => {
              const isHidden = (item as any).hidden === true;
              if (isHidden) return null;

              return (
                <div key={idx} className="min-w-0 space-y-4 text-sm break-words">
                  <span className="block font-medium break-words">
                    {item.title}
                  </span>

                  <div className="flex min-w-0 flex-wrap gap-4 sm:flex-col">
                    {item.children?.map((subItem, iidx) => {
                      if (isFeedbackLink(subItem.url)) {
                        return (
                          <button
                            key={iidx}
                            onClick={() => setFeedbackOpen(true)}
                            className="text-muted-foreground hover:text-primary block break-words duration-150 text-left"
                          >
                            <span className="break-words">{subItem.title || ""}</span>
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={iidx}
                          href={subItem.url || ""}
                          target={subItem.target || ""}
                          className="text-muted-foreground hover:text-primary block break-words duration-150"
                        >
                          <span className="break-words">{subItem.title || ""}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-8">
          {footer.show_built_with !== false ? <BuiltWith /> : null}
          <div className="min-w-0 flex-1" />
          {footer.show_theme !== false ||
          footer.show_theme_switcher !== false ||
          footer.show_locale !== false ? (
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 py-1">
              {footer.show_theme_switcher !== false ? (
                <ThemeSwitcher className="text-muted-foreground hover:text-foreground" />
              ) : null}
              {footer.show_theme !== false ? (
                <ThemeToggler
                  className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                />
              ) : null}
              {footer.show_locale !== false ? <LocaleSelector type="button" /> : null}
            </div>
          ) : null}
        </div>

        <div
          aria-hidden
          className="h-px min-w-0 [background-image:linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] bg-[length:6px_1px] bg-repeat-x opacity-25"
        />
        <div className="flex min-w-0 flex-wrap justify-between gap-8">
          {footer.copyright ? (
            <p
              className="text-muted-foreground text-sm text-balance break-words"
              dangerouslySetInnerHTML={{ __html: footer.copyright }}
            />
          ) : footer.brand ? (
            <Copyright brand={footer.brand} />
          ) : null}

          <div className="min-w-0 flex-1"></div>

          {footer.agreement ? (
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              {footer.agreement?.items.map((item: NavItem, index: number) => {
                if (isFeedbackLink(item.url)) {
                  return (
                    <button
                      key={index}
                      onClick={() => setFeedbackOpen(true)}
                      className="text-muted-foreground hover:text-primary block text-xs break-words underline duration-150"
                    >
                      {item.title || ""}
                    </button>
                  );
                }
                return (
                  <Link
                    key={index}
                    href={item.url || ""}
                    target={item.target || ""}
                    className="text-muted-foreground hover:text-primary block text-xs break-words underline duration-150"
                  >
                    {item.title || ""}
                  </Link>
                );
              })}
            </div>
          ) : null}

          {footer.social ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {footer.social?.items.map((item: NavItem, index) => {
                const isHidden = (item as any).hidden === true;
                if (isHidden) return null;

                if (isFeedbackLink(item.url)) {
                  return (
                    <button
                      key={index}
                      onClick={() => setFeedbackOpen(true)}
                      className="text-muted-foreground hover:text-primary bg-background block cursor-pointer rounded-full p-2 duration-150"
                      aria-label={item.title || "Email"}
                    >
                      {item.icon && (
                        <SmartIcon name={item.icon as string} size={20} />
                      )}
                    </button>
                  );
                }
                return (
                  <Link
                    key={index}
                    href={item.url || ""}
                    target={item.target || ""}
                    className="text-muted-foreground hover:text-primary bg-background block cursor-pointer rounded-full p-2 duration-150"
                    aria-label={item.title || "Social media link"}
                  >
                    {item.icon && (
                      <SmartIcon name={item.icon as string} size={20} />
                    )}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
