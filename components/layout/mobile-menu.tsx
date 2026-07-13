"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { mainNav } from "@/config/navigation";
import { GlobalSearch } from "@/components/layout/global-search";

/**
 * MobileMenu – "Menu"-knap i topbaren, som KUN vises på mobil.
 *
 * HVORFOR DEN FINDES: sidebaren er skjult på mobil (hidden … lg:flex), og
 * bund-tab-baren viser kun 4 af de 9 sider. Mail, Kalender, Opgaver og
 * Markedsføring kunne derfor SLET IKKE nås fra en telefon – de virkede kun på
 * desktop. Global søgning var på samme måde skjult (hidden … md:flex).
 *
 * Denne menu giver adgang til HELE navigationen + søgningen på mobil, så alt
 * der virker på desktop også kan bruges på telefonen.
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

  // Escape lukker.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Åbn menu"
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onPointerDown={(e) =>
                  e.target === e.currentTarget && setOpen(false)
                }
              >
                <motion.div
                  className="max-h-[85vh] overflow-y-auto rounded-t-card border-t border-border/70 bg-card pb-[calc(1rem+env(safe-area-inset-bottom))]"
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
                    <h2 className="text-base font-semibold">Menu</h2>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Luk menu"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Søgning – var før kun tilgængelig på desktop. */}
                  <div className="px-5 pt-4">
                    <GlobalSearch />
                  </div>

                  {/* HELE navigationen – ikke kun de 4 i bund-baren. */}
                  <nav className="grid grid-cols-2 gap-2 p-5">
                    {mainNav.map((item) => {
                      const isActive =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium leading-tight transition-colors",
                            isActive
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/60 bg-secondary/30 text-foreground hover:bg-secondary",
                          )}
                        >
                          <span aria-hidden className="text-base">
                            {item.emoji}
                          </span>
                          <Icon className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1">{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
