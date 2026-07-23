"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { mainNav } from "@/config/navigation";
import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";
import { GlobalSearch } from "@/components/layout/global-search";

/**
 * MobileMenu – hamburger-knap øverst til højre (kun mobil) + FULDSKÆRMS-overlay
 * med HELE navigationen.
 *
 * På mobil er desktop-sidebaren skjult, og bund-tab-baren er fjernet – AL
 * navigation sker herfra. Menuen viser alle 9 undersider (samme som desktop) +
 * den globale søgning, så intet på telefonen mangler i forhold til computeren.
 *
 * Overlayet er BEVIDST uigennemsigtigt (bg-background, ingen blur): blur/
 * gennemsigtige fixed-lag er præcis det, der giver hvid skærm/flimmer på
 * mobil-browsere.
 */
export function MobileMenu() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => setMounted(true), []);

  // Luk automatisk når man er navigeret til en ny side.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape lukker + lås baggrunds-scroll mens menuen er åben.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Åbn menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary lg:hidden"
      >
        <Menu className="size-6" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-[60] flex flex-col bg-background lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {/* Header – logo + luk. pt-safe så luk-knappen ikke havner
                    under telefonens notch/statusbjælke. */}
                <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 pt-[env(safe-area-inset-top)]">
                  <div className="flex items-center gap-2">
                    <Logo size={34} animated={false} />
                    <span className="text-base font-semibold">{siteConfig.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Luk menu"
                    className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <X className="size-6" />
                  </button>
                </div>

                {/* Indhold – scroller hvis nødvendigt. */}
                <div className="flex-1 overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5">
                  {/* Søgning (var før kun på desktop). */}
                  <GlobalSearch />

                  {/* HELE navigationen som store, letramte rækker. */}
                  <nav className="mt-5 space-y-2">
                    {mainNav.map((item, i) => {
                      const isActive =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href);
                      const Icon = item.icon;

                      return (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * i + 0.05, duration: 0.2, ease: "easeOut" }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex min-h-[3.75rem] items-center gap-3 rounded-2xl border px-4 py-3 text-base font-medium transition-colors",
                              isActive
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border/60 bg-secondary/30 text-foreground active:bg-secondary",
                            )}
                          >
                            <span aria-hidden className="text-xl">
                              {item.emoji}
                            </span>
                            <Icon className="size-5 shrink-0" />
                            <span className="min-w-0 flex-1">{item.label}</span>
                            <ChevronRight
                              className={cn(
                                "size-5 shrink-0",
                                isActive ? "text-primary" : "text-muted-foreground/50",
                              )}
                            />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </nav>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
