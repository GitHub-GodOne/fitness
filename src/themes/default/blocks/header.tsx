"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";

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

export function Header({
  header,
  mobileNavMode = "accordion",
}: {
  header: HeaderType;
  mobileNavMode?: "accordion" | "tabs";
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileHeaderOffset, setMobileHeaderOffset] = useState(0);
  const headerShellRef = useRef<HTMLDivElement>(null);
  const headerHeightRef = useRef(56);
  const lastScrollYRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const isLarge = useMedia("(min-width: 64rem)");
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAppContext();
  const { navigateWithAuth } = useRequireAuth({
    callbackUrl: "/ai-video-generator",
  });
  const showMobileTabs =
    mobileNavMode === "tabs" && (header.nav?.items?.length || 0) > 0;

  useEffect(() => {
    const updateHeaderHeight = () => {
      headerHeightRef.current = headerShellRef.current?.offsetHeight ?? 56;
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, [showMobileTabs]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollYRef.current;
        setIsScrolled(currentScrollY > 50);

        if (window.innerWidth >= 1024 || isMobileMenuOpen) {
          setMobileHeaderOffset(0);
          lastScrollYRef.current = currentScrollY;
          scrollFrameRef.current = null;
          return;
        }

        if (currentScrollY <= 8) {
          setMobileHeaderOffset(0);
          lastScrollYRef.current = currentScrollY;
          scrollFrameRef.current = null;
          return;
        }

        setMobileHeaderOffset((prev) => {
          const nextOffset = prev + delta;
          return Math.max(0, Math.min(headerHeightRef.current, nextOffset));
        });

        lastScrollYRef.current = currentScrollY;
        scrollFrameRef.current = null;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isLarge || isMobileMenuOpen) {
      setMobileHeaderOffset(0);
    }
  }, [isLarge, isMobileMenuOpen]);

  useEffect(() => {
    if (showMobileTabs && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [showMobileTabs, isMobileMenuOpen]);

  const isNavItemActive = (url?: string) => {
    if (!url) return false;
    if (!url.startsWith("/")) return false;

    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const normalizedUrl = url === "/" ? "/" : url.replace(/\/$/, "");

    return (
      normalizedPath === normalizedUrl ||
      normalizedPath.startsWith(`${normalizedUrl}/`)
    );
  };

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
        className="fixed inset-x-0 top-0 z-50 data-[state=active]:bg-background data-[state=active]:h-screen"
      >
        <div
          ref={headerShellRef}
          className={cn(
            "absolute inset-x-0 top-0 z-50 bg-background border-b border-border ring-1 ring-transparent will-change-transform transition-[background-color,box-shadow,border-color,height] duration-300",
            "lg:has-data-[state=open]:ring-foreground/5 lg:has-data-[state=open]:bg-card lg:has-data-[state=open]:h-[calc(var(--navigation-menu-viewport-height)+3.4rem)] lg:has-data-[state=open]:shadow-lg lg:has-data-[state=open]:shadow-black/10",
            "h-18",
            showMobileTabs
              ? "max-lg:h-24 max-lg:in-data-[state=active]:h-24"
              : "max-lg:h-14 max-lg:overflow-hidden max-lg:in-data-[state=active]:h-screen",
            "max-lg:in-data-[state=active]:bg-background",
          )}
          style={{
            transform: `translateY(-${isLarge || isMobileMenuOpen ? 0 : mobileHeaderOffset}px)`,
          }}
        >
          <div className="container px-4 sm:px-6 md:px-8">
            <div className="relative flex items-center justify-between h-14 lg:h-18">
              {/* Left section: Brand Logo + Navigation */}
              <div className="flex items-center gap-3 sm:gap-8">
                {header.brand && (
                  <BrandLogo
                    brand={header.brand}
                    className="gap-2 sm:gap-3"
                    logoClassName="h-6 w-auto rounded-md sm:h-8 sm:rounded-lg"
                    titleClassName="text-sm sm:text-lg"
                  />
                )}
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
                  {header.show_notification && !!user ? <NotificationBell /> : null}
                  {header.show_sign ? (
                    <SignUser
                      userNav={header.user_nav}
                      showNotification={false}
                    />
                  ) : null}
                </div>

                {/* Mobile: Show notification bell + Sign In */}
                <div className="flex lg:hidden items-center gap-2 overflow-visible">
                  {header.buttons?.map((button, idx) => (
                    <Button
                      key={`mobile-cta-${idx}`}
                      type="button"
                      size="icon-sm"
                      className="h-7 w-7 rounded-full bg-primary p-0 text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-8 sm:w-8"
                      aria-label={button.title}
                      title={button.title}
                      onClick={() => navigateWithAuth(button.url || "")}
                    >
                      <Sparkles className="size-3.5 sm:size-4" />
                    </Button>
                  ))}
                  {header.show_notification && !!user ? <NotificationBell /> : null}
                  {header.show_sign ? (
                    <div className="flex-shrink-0">
                      <SignUser
                        userNav={header.user_nav}
                        showNotification={false}
                      />
                    </div>
                  ) : null}
                </div>

                {/* Mobile menu button */}
                {!showMobileTabs ? (
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label={
                      isMobileMenuOpen == true ? "Close Menu" : "Open Menu"
                    }
                    className="relative z-20 -m-2 block cursor-pointer p-2 lg:hidden sm:-m-2.5 sm:p-2.5"
                  >
                    <Menu className="m-auto size-4.5 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0 sm:size-5" />
                    <X className="absolute inset-0 m-auto size-4.5 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100 sm:size-5" />
                  </button>
                ) : null}
              </div>
            </div>

            {showMobileTabs ? (
              <div className="lg:hidden border-t border-border/70">
                <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
                  <nav
                    aria-label="Mobile navigation tabs"
                    className="flex h-10 min-w-max items-center gap-4"
                  >
                    {header.nav?.items?.map((item, idx) => {
                      const isActive = isNavItemActive(item.url);

                      return (
                        <Link
                          key={`${item.title}-${idx}`}
                          href={item.url || ""}
                          target={item.target || "_self"}
                          className={cn(
                            "inline-flex h-8 shrink-0 items-center whitespace-nowrap px-0.5 text-sm transition-colors",
                            isActive
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.title}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </div>
            ) : null}

            {/* Mobile menu */}
            {!isLarge && !showMobileTabs && isMobileMenuOpen && (
              <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
