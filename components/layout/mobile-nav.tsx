"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { mobileNav } from "@/config/navigation";

/**
 * MobileNav – bund-tab-bar på mobil (giver en rigtig "app-følelse").
 * Vises kun på små skærme; på desktop bruges sidebaren i stedet.
 *
 * HØJDEN: baren havde før en FAST højde (h-16) med
 * pb-[env(safe-area-inset-bottom)] INDE i den. På en iPhone er
 * safe-area-inset-bottom ~34px (plads til hjemme-indikatoren), så de 34px
 * blev spist AF de 64px – der var kun ~30px tilbage til ikon (20px) + tekst,
 * og teksten blev derfor klippet af i bunden.
 *
 * Nu er højden i stedet indholds-bestemt: hvert faneblad har min-h-16 +
 * luft, og safe-area-afstanden lægges OVEN I som padding på selve baren. Så
 * er der altid plads til hele teksten, uanset telefon.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border/60 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {mobileNav.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              // min-h-16: bevarer den velkendte tab-bar-højde, men som et
              // MINIMUM – baren må gerne vokse, hvis teksten kræver det.
              // leading-tight: giver plads til underlængder (fx "g" i
              // "Storgaard"), som ellers blev skåret af.
              "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[11px] font-medium leading-tight transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" />
            <span className="w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
