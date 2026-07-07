"use client";

import Link from "next/link";
import { Car, ArrowUpRight } from "lucide-react";
import type { BilinfoSummary } from "@/lib/bilinfo/types";

/**
 * Knappen i bunden af Arbejdsoverblik (venstre kolonne) der fører til den
 * fulde "Biler der mangler billeder/udstyr"-side.
 *
 * Baggrunden bruger temaets --greeting-bg (samme grønne/tema-farvede
 * gradient som "Godmorgen"-kortet), så knappen automatisk står i en
 * kontrastfyldt farve der matcher det valgte tema i både lyst og mørkt.
 */
export function BilinfoSection({ summary }: { summary: BilinfoSummary }) {
  // Ikke opsat / feedet fejlede – vis slet ikke knappen frem for en tom kasse.
  if (!summary.ok) return null;

  const total =
    summary.missingEquipment.length + summary.noPictures.length + summary.fewPictures.length;

  // Kort opsummering under titlen – kun de grupper der faktisk mangler noget.
  const parts: string[] = [];
  if (summary.missingEquipment.length) parts.push(`${summary.missingEquipment.length} mangler udstyr`);
  if (summary.noPictures.length) parts.push(`${summary.noPictures.length} uden billeder`);
  if (summary.fewPictures.length) parts.push(`${summary.fewPictures.length} mangler pro-billeder`);
  const subtitle = total === 0 ? "Alt er opdateret 🎉" : parts.join(" · ");

  return (
    <div className="mt-5">
      <Link
        href="/biler-mangler"
        className="group relative flex items-center gap-3 overflow-hidden rounded-card border border-white/15 px-4 py-3.5 text-white shadow-greeting transition-transform duration-200 hover:-translate-y-0.5"
        style={{ backgroundImage: "var(--greeting-bg)" }}
      >
        {/* glas-skær, samme mønster som "Godmorgen"-kortet */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.22), transparent 55%)",
          }}
        />

        <span
          aria-hidden
          className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm"
        >
          <Car className="size-5" />
        </span>

        <span className="relative min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-snug">
            Biler der mangler billeder/udstyr
          </span>
          <span className="mt-0.5 block truncate text-xs text-white/75">{subtitle}</span>
        </span>

        {total > 0 && (
          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold tabular-nums ring-1 ring-white/20">
            {total}
          </span>
        )}
        <ArrowUpRight className="relative size-4 shrink-0 text-white/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
}
