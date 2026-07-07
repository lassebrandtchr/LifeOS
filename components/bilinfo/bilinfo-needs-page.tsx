"use client";

import Link from "next/link";
import {
  Car,
  ArrowLeft,
  ListChecks,
  CameraOff,
  ImageUp,
  Check,
  Palette,
  Gauge,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BilinfoSummary, CarNeedingWork } from "@/lib/bilinfo/types";

const WORK = "var(--accent-work)";

/**
 * Farvekodning af de 3 sektioner, så de er nemme at adskille visuelt uden at
 * bryde med resten af designsproget – samme "bløde badge"-stil (farvet 15%
 * baggrund + farvet tekst) som allerede bruges andre steder i appen, blot
 * sat konsekvent på ikon, antal-badge og en tynd farvet venstrekant på hver
 * sektions-boks.
 */
const GROUP_TONE = {
  amber: {
    box: "border-amber-500/25 border-l-amber-500 bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  red: {
    box: "border-red-500/25 border-l-red-500 bg-red-500/5",
    badge: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  sky: {
    box: "border-sky-500/25 border-l-sky-500 bg-sky-500/5",
    badge: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
} as const;
type GroupTone = keyof typeof GROUP_TONE;

/** Lille meta-chip (farve, km, årgang) på hvert bilkort. */
function Meta({ Icon, children }: { Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}

function CarCard({
  car,
  showPictures,
  tone,
}: {
  car: CarNeedingWork;
  showPictures?: boolean;
  tone: GroupTone;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-snug text-foreground">
          {car.name}
          {car.year && <span className="font-normal text-muted-foreground"> · {car.year}</span>}
        </span>
        {showPictures && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              GROUP_TONE[tone].badge,
            )}
          >
            {car.pictureCount} billeder
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {car.color && <Meta Icon={Palette}>{car.color}</Meta>}
        {car.mileage && <Meta Icon={Gauge}>{car.mileage}</Meta>}
        <Meta Icon={Tag}>
          <span className="font-semibold text-foreground">{car.price}</span>
        </Meta>
      </div>
    </li>
  );
}

/**
 * En gruppe biler med overskrift, antal og enten kort-liste eller "alt ok".
 * Hele gruppen ligger i en tone-farvet boks (venstrekant + svag baggrund),
 * så de 3 sektioner (udstyr/0 billeder/pro-billeder) er tydeligt adskilte.
 */
function CarGroup({
  Icon,
  title,
  cars,
  emptyLabel,
  showPictures,
  tone,
  level = "h2",
}: {
  Icon: LucideIcon;
  title: string;
  cars: CarNeedingWork[];
  emptyLabel: string;
  showPictures?: boolean;
  tone: GroupTone;
  level?: "h2" | "h3";
}) {
  const Heading = level;
  const empty = cars.length === 0;
  return (
    <div className={cn("rounded-xl border border-l-4 p-4 sm:p-5", GROUP_TONE[tone].box)}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", GROUP_TONE[tone].badge)}>
          <Icon className="size-4" />
        </span>
        <Heading className={cn(level === "h2" ? "text-lg font-semibold" : "text-base font-semibold")}>
          {title}
        </Heading>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            empty ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : GROUP_TONE[tone].badge,
          )}
        >
          {cars.length}
        </span>
      </div>

      {empty ? (
        <p className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="size-4" />
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cars.map((c) => (
            <CarCard key={c.key} car={c} showPictures={showPictures} tone={tone} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function BilinfoNeedsPage({ summary }: { summary: BilinfoSummary }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Tilbage til forsiden
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in oklab, ${WORK} 16%, transparent)`, color: WORK }}
          >
            <Car className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Biler der mangler billeder/udstyr</h1>
            <p className="text-sm text-muted-foreground">
              {summary.ok
                ? `Live fra Bilinfo · ${summary.totalCars} biler i alt`
                : "Kunne ikke hente data fra Bilinfo lige nu."}
            </p>
          </div>
        </div>
      </div>

      {/* Sektion 1: Mangler udstyr (amber) */}
      <section className="glass-card rounded-card p-5 sm:p-6">
        <CarGroup
          Icon={ListChecks}
          title="Biler der mangler udstyr"
          cars={summary.missingEquipment}
          emptyLabel="Alle biler har udstyr registreret"
          tone="amber"
        />
      </section>

      {/* Sektion 2: Mangler billeder – to farvekodede undersektioner (rød/blå) */}
      <section className="glass-card rounded-card space-y-6 p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <CameraOff className="size-5 shrink-0" style={{ color: WORK }} />
          <h2 className="text-xl font-semibold tracking-tight">Biler der mangler billeder</h2>
        </div>

        <CarGroup
          level="h3"
          Icon={CameraOff}
          title="Biler med 0 billeder"
          cars={summary.noPictures}
          emptyLabel="Alle biler har mindst ét billede"
          showPictures
          tone="red"
        />

        <CarGroup
          level="h3"
          Icon={ImageUp}
          title="Biler der mangler professionelle billeder"
          cars={summary.fewPictures}
          emptyLabel="Alle biler har fulde billedsæt (over 14 billeder)"
          showPictures
          tone="sky"
        />
      </section>
    </div>
  );
}
