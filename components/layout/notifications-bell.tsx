"use client";

import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/features/dashboard/notifications";

const toneDot: Record<NotificationItem["tone"], string> = {
  danger: "bg-destructive",
  warn: "bg-warning",
};

/**
 * Notifikationsklokke i topbaren. Bruger de samme tal som "Arbejdsoverblik"
 * på forsiden (forfaldne/haste-/vigtige opgaver) – klik på en linje åbner
 * de relevante opgaver, ligesom Arbejdsoverblikkets klikbare linjer.
 */
export function NotificationsBell({ items }: { items: NotificationItem[] }) {
  const count = items.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={count > 0 ? `Notifikationer (${count})` : "Notifikationer"}
          className="relative"
        >
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifikationer</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {count === 0 ? (
          <div className="flex items-center gap-2 px-2.5 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            Intet der kræver din opmærksomhed lige nu.
          </div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.href} className="items-start gap-2.5 py-2.5">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", toneDot[item.tone])} />
                <span className="text-sm leading-snug">{item.text}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
