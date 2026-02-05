"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { Link, usePathname, useRouter } from "@/core/i18n/navigation";
import {
  BrandLogo,
  LocaleSelector,
  SignUser,
  SmartIcon,
  ThemeToggler,
} from "@/shared/blocks/common";
import { ThemeSwitcher } from "@/shared/components/theme-switcher";
import { NotificationBell } from "@/shared/components/notification";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";
import { Button } from "@/shared/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
  NavigationMenuTrigger as RawNavigationMenuTrigger,
} from "@/shared/components/ui/navigation-menu";
import { useMedia } from "@/shared/hooks/use-media";
import { useRequireAuth } from "@/shared/hooks/use-require-auth";
import { useAppContext } from "@/shared/contexts/app";
import { cn } from "@/shared/lib/utils";
import { NavItem } from "@/shared/types/blocks/common";
import { Header as HeaderType } from "@/shared/types/blocks/landing";

// For Next.js hydration mismatch warning, conditionally render NavigationMenuTrigger only after mount to avoid inconsistency between server/client render
function NavigationMenuTrigger(
  props: React.ComponentProps<typeof RawNavigationMenuTrigger>,
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Only render after client has mounted, to avoid SSR/client render id mismatch
  if (!mounted) return null;
  return <RawNavigationMenuTrigger {...props} />;
}

export function Header({ header }: { header: HeaderType }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isLarge = useMedia("(min-width: 64rem)");
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAppContext();
  const { navigateWithAuth } = useRequireAuth({
    callbackUrl: "/ai-video-generator",
  });

  useEffect(() => {
    // Listen to scroll event to enable header styles on scroll
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Navigation menu for large screens
  const NavMenu = () => {
    const menuRef = useRef<React.ElementRef<typeof NavigationMenu>>(null);

    // Calculate dynamic viewport height for animated menu
    const handleViewportHeight = () => {
      requestAnimationFrame(() => {
        const menuNode = menuRef.current;
        if (!menuNode) return;

        const openContent = document.querySelector<HTMLElement>(
          '[data-slot="navigation-menu-viewport"][data-state="open"]',
        );

        if (openContent) {
          const height = openContent.scrollHeight;
          document.documentElement.style.setProperty(
            "--navigation-menu-viewport-height",
            `${height}px`,
          );
        } else {
          document.documentElement.style.removeProperty(
            "--navigation-menu-viewport-height",
          );
        }
      });
    };

    return (
      <div className="hidden lg:flex items-center">
        {header.nav?.items?.map((item, idx) => {
          const isLast = idx === (header.nav?.items?.length || 0) - 1;
          return (
            <div key={idx} className="flex items-center">
              <Link
                href={item.url || ""}
                target={item.target || "_self"}
                className="text-sm text-foreground no-underline hover:no-underline hover:text-foreground px-2 cursor-pointer"
              >
                {item.title}
              </Link>
              {!isLast && <span className="text-muted-foreground px-2">|</span>}
            </div>
          );
        })}
      </div>
    );
  };

  // Mobile menu using Accordion, shown on small screens
  const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
    return (
      <nav
        role="navigation"
        className="w-full [--color-border:--alpha(var(--color-foreground)/5%)] [--color-muted:--alpha(var(--color-foreground)/5%)]"
      >
        <Accordion
          type="single"
          collapsible
          className="-mx-4 mt-0.5 space-y-0.5 **:hover:no-underline"
        >
          {header.nav?.items?.map((item, idx) => {
            return (
              <AccordionItem
                key={idx}
                value={item.title || ""}
                className="group relative border-b-0 before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:border-b"
              >
                {item.children && item.children.length > 0 ? (
                  <>
                    <AccordionTrigger className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg **:!font-normal">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <ul>
                        {item.children?.map((subItem: NavItem, iidx) => (
                          <li key={iidx}>
                            <Link
                              href={subItem.url || ""}
                              onClick={closeMenu}
                              className="grid grid-cols-[auto_1fr] items-center gap-2.5 px-4 py-2"
                            >
                              <div
                                aria-hidden
                                className="flex items-center justify-center *:size-4"
                              >
                                {subItem.icon && (
                                  <SmartIcon name={subItem.icon as string} />
                                )}
                              </div>
                              <div className="text-base">{subItem.title}</div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </>
                ) : (
                  <Link
                    href={item.url || ""}
                    onClick={closeMenu}
                    className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg **:!font-normal"
                  >
                    {item.title}
                  </Link>
                )}
              </AccordionItem>
            );
          })}
          {/* Create Video buttons at the end of mobile menu */}
          {header.buttons &&
            header.buttons.map((button, idx) => (
              <button
                key={`btn-${idx}`}
                onClick={() => {
                  closeMenu();
                  navigateWithAuth(button.url || "");
                }}
                className="flex items-center justify-between px-4 py-3 text-lg border-b border-border/10 w-full text-left cursor-pointer hover:bg-muted/50"
              >
                {button.title}
              </button>
            ))}
        </Accordion>
      </nav>
    );
  };

  // List item for submenus in NavigationMenu
  function ListItem({
    title,
    description,
    children,
    href,
    target,
    ...props
  }: React.ComponentPropsWithoutRef<"li"> & {
    href: string;
    title: string;
    description?: string;
    target?: string;
  }) {
    return (
      <li {...props}>
        <NavigationMenuLink asChild>
          <Link
            href={href}
            target={target || "_self"}
            className="grid grid-cols-[auto_1fr] gap-3.5"
          >
            <div className="bg-background ring-foreground/10 relative flex size-9 items-center justify-center rounded border border-transparent shadow shadow-sm ring-1">
              {children}
            </div>
            <div className="space-y-0.5">
              <div className="text-foreground text-sm font-medium">{title}</div>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {description}
              </p>
            </div>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  }

  return (
    <>
      <header
        data-state={isMobileMenuOpen ? "active" : "inactive"}
        {...(isScrolled && { "data-scrolled": true })}
        className="has-data-[state=open]:bg-background fixed inset-x-0 top-0 z-50 has-data-[state=open]:h-screen"
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 z-50 h-18 bg-background border-b border-border ring-1 ring-transparent transition-all duration-300",
            "has-data-[state=open]:ring-foreground/5 has-data-[state=open]:bg-card has-data-[state=open]:h-[calc(var(--navigation-menu-viewport-height)+3.4rem)] has-data-[state=open]:shadow-lg has-data-[state=open]:shadow-black/10",
            "max-lg:in-data-[state=active]:bg-background max-lg:h-14 max-lg:overflow-hidden max-lg:in-data-[state=active]:h-screen",
          )}
        >
          <div className="px-4 sm:px-2 lg:px-8">
            <div className="relative flex items-center justify-between h-14 lg:h-18">
              {/* Left section: Brand Logo + Navigation */}
              <div className="flex items-center gap-8">
                {header.brand && <BrandLogo brand={header.brand} />}
                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center">
                  <NavMenu />
                </div>
              </div>

              {/* Right section: Buttons, Theme, Locale, Sign In */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Desktop: Full menu */}
                <div className="hidden lg:flex items-center gap-3">
                  {header.show_theme_switcher ? <ThemeSwitcher /> : null}
                  {header.show_theme_toggler ? <ThemeToggler /> : null}
                  {header.show_locale ? <LocaleSelector /> : null}
                  {header.show_notification ? <NotificationBell /> : null}
                  {header.buttons &&
                    header.buttons.map((button, idx) =>
                      user ? (
                        <Button
                          key={idx}
                          variant="default"
                          size="sm"
                          className="rounded-full text-sm"
                          onClick={() => navigateWithAuth(button.url || "")}
                        >
                          {button.title}
                        </Button>
                      ) : (
                        <span
                          key={idx}
                          onClick={() => navigateWithAuth(button.url || "")}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                          {button.title}
                        </span>
                      ),
                    )}
                  {header.show_sign ? (
                    <SignUser userNav={header.user_nav} />
                  ) : null}
                </div>

                {/* Mobile: Show only Sign In */}
                <div className="flex lg:hidden items-center gap-2 overflow-visible">
                  {header.show_sign ? (
                    <div className="flex-shrink-0">
                      <SignUser userNav={header.user_nav} />
                    </div>
                  ) : null}
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label={
                    isMobileMenuOpen == true ? "Close Menu" : "Open Menu"
                  }
                  className="relative z-20 -m-2.5 block cursor-pointer p-2.5 lg:hidden"
                >
                  <Menu className="m-auto size-5 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0" />
                  <X className="absolute inset-0 m-auto size-5 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100" />
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            {!isLarge && isMobileMenuOpen && (
              <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
