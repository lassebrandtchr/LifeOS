import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import type { Tone } from "@/features/dashboard/data";

/**
 * Tone → tekstfarve. Bruges til at fremhæve værdier (fx "haster" = rød).
 */
const toneClass: Record<Tone, string> = {
  neutral: "text-foreground",
  primary: "text-primary",
  warning: "text-warning",
  success: "text-success",
  danger: "text-destructive",
};

/**
 * SectionCard – fælles kort-skabelon til dashboardets overbliks-kort.
 * Giver ensartet ikon, titel, valgfrit "se alt"-link og hover-effekt.
 */
export function SectionCard({
  title,
  icon: Icon,
  href,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card interactive className={cn("group flex h-full flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary transition-all duration-200 ease-out group-hover:scale-105 group-hover:bg-primary/15">
            <Icon className="size-5" />
          </div>
          <CardTitle>{title}</CardTitle>
        </div>
        {href && (
          <Link
            href={href}
            aria-label={`Åbn ${title}`}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all duration-200 hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}

/**
 * StatLine – en række med etiket til venstre og en fremhævet værdi til højre.
 */
export function StatLine({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold", toneClass[tone])}>
        {value}
      </span>
    </div>
  );
}
