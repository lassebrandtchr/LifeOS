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

/** Lille meta-chip (farve, km, årgang) på hvert bilkort. */
function Meta({ Icon, children }: { Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}

function CarCard({ car, showPictures }: { car: CarNeedingWork; showPictures?: boolean }) {
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
              car.pictureCount === 0
                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
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

/** En gruppe biler med overskrift, antal og enten kort-liste eller "alt ok". */
function CarGroup({
  Icon,
  title,
  cars,
  emptyLabel,
  showPictures,
  level = "h2",
}: {
  Icon: LucideIcon;
  title: string;
  cars: CarNeedingWork[];
  emptyLabel: string;
  showPictures?: boolean;
  level?: "h2" | "h3";
}) {
  const Heading = level;
  const empty = cars.length === 0;
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <Heading className={cn(level === "h2" ? "text-lg font-semibold" : "text-base font-semibold")}>
          {title}
        </Heading>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            empty ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-secondary text-muted-foreground",
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
            <CarCard key={c.key} car={c} showPictures={showPictures} />
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

      {/* Sektion 1: Mangler udstyr */}
      <section className="glass-card rounded-card p-5 sm:p-6">
        <CarGroup
          Icon={ListChecks}
          title="Biler der mangler udstyr"
          cars={summary.missingEquipment}
          emptyLabel="Alle biler har udstyr registreret"
        />
      </section>

      {/* Sektion 2: Mangler billeder (to undersektioner) */}
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
        />

        <CarGroup
          level="h3"
          Icon={ImageUp}
          title="Biler der mangler professionelle billeder"
          cars={summary.fewPictures}
          emptyLabel="Alle biler har fulde billedsæt (over 10 billeder)"
          showPictures
        />
      </section>
    </div>
  );
}
