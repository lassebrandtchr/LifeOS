"use client";

import * as React from "react";
import { Car, ListChecks, CameraOff, ImageUp, Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BilinfoSummary, CarNeedingWork } from "@/lib/bilinfo/types";

/**
 * Forsidens "mangler-oversigt" i bunden af Arbejdsoverblik – viser hvilke
 * Bilinfo-biler der stadig mangler udstyr eller billeder, så det er til at
 * få øje på uden at logge ind i Bilinfo.
 *
 * Tre grupper: manglende udstyr, ingen billeder (0), og "mangler
 * professionelle billeder" (1–10). Hver bil vises med sin korte kode – de
 * sidste 5 cifre af Bilinfo-annonce-id'et (feedet har ikke stelnummer/VIN).
 */

const TONE = {
  amber: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", tint: "#f59e0b" },
  red: { dot: "bg-red-500", text: "text-red-500 dark:text-red-400", tint: "#ef4444" },
  teal: { dot: "bg-teal-500", text: "text-teal-600 dark:text-teal-300", tint: "#14b8a6" },
} as const;

type Tone = keyof typeof TONE;

function IconBadge({ Icon, tint }: { Icon: LucideIcon; tint: string }) {
  return (
    <span
      aria-hidden
      className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15 backdrop-blur-sm"
      style={{
        backgroundImage: `radial-gradient(120% 120% at 30% 20%, color-mix(in oklab, ${tint} 55%, transparent), color-mix(in oklab, ${tint} 18%, transparent))`,
      }}
    >
      <Icon className="size-3.5" style={{ color: tint }} strokeWidth={2.25} />
      <span
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.4), transparent 55%)" }}
      />
    </span>
  );
}

function CarRow({ car }: { car: CarNeedingWork }) {
  const title = [car.make, car.model].filter(Boolean).join(" ") || "Ukendt bil";
  return (
    <li className="flex items-baseline gap-2 py-0.5">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
        <span className="font-medium">{title}</span>
        {car.variant && <span className="text-muted-foreground"> {car.variant}</span>}
      </span>
      <span
        className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground"
        title="Sidste 5 cifre af Bilinfo-annonce-id"
      >
        #{car.code}
      </span>
    </li>
  );
}

function Group({
  Icon,
  tone,
  label,
  cars,
  emptyLabel,
}: {
  Icon: LucideIcon;
  tone: Tone;
  label: string;
  cars: CarNeedingWork[];
  emptyLabel: string;
}) {
  const t = TONE[tone];
  const empty = cars.length === 0;
  return (
    <div>
      <div className="flex items-center gap-2">
        <IconBadge Icon={Icon} tint={t.tint} />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            empty ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : cn("bg-secondary", t.text),
          )}
        >
          {cars.length}
        </span>
      </div>
      {empty ? (
        <p className="mt-1 flex items-center gap-1.5 pl-8 text-xs text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" />
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-1 pl-8">
          {cars.map((c) => (
            <CarRow key={c.key} car={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function BilinfoSection({ summary }: { summary: BilinfoSummary }) {
  // Ikke opsat / feedet fejlede – vis slet ikke sektionen frem for en tom kasse.
  if (!summary.ok) return null;

  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <Car className="size-3.5" />
        Biler der mangler arbejde
      </p>

      <div className="space-y-3">
        <Group
          Icon={ListChecks}
          tone="amber"
          label="Mangler udstyr"
          cars={summary.missingEquipment}
          emptyLabel="Alle biler har udstyr"
        />
        <Group
          Icon={CameraOff}
          tone="red"
          label="Mangler billeder"
          cars={summary.noPictures}
          emptyLabel="Alle biler har billeder"
        />
        <Group
          Icon={ImageUp}
          tone="teal"
          label="Mangler professionelle billeder"
          cars={summary.fewPictures}
          emptyLabel="Alle biler har fulde billedsæt"
        />
      </div>
    </div>
  );
}
