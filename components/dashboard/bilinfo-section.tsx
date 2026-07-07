"use client";

import Link from "next/link";
import { Camera, SquareCheckBig, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BilinfoSummary } from "@/lib/bilinfo/types";

/**
 * Knappen i bunden af Arbejdsoverblik (venstre kolonne) der fører til den
 * fulde "Biler der mangler billeder/udstyr"-side.
 *
 * Fast, iøjnefaldende orange "liquid glass"-gradient (bevidst IKKE en
 * tema-token som --greeting-bg – Lasse vil have den til at skille sig ud i
 * alle temaer, ikke matche dem). Højden styres af forælderen (className
 * "flex-1" fra DayBriefing), så knappen altid fylder resten af venstre
 * kolonne op til samme højde som nyhedslisten til højre – uanset hvor
 * mange/lange nyhedsoverskrifter der er den dag.
 */
export function BilinfoSection({
  summary,
  className,
}: {
  summary: BilinfoSummary;
  className?: string;
}) {
  // Ikke opsat / feedet fejlede – vis slet ikke knappen frem for en tom kasse.
  if (!summary.ok) return null;

  const total =
    summary.missingEquipment.length + summary.noPictures.length + summary.fewPictures.length;

  // Kort opsummering under titlen – kun de grupper der faktisk mangler noget.
  const parts: string[] = [];
  if (summary.missingEquipment.length) parts.push(`${summary.missingEquipment.length} mangler udstyr`);
  if (summary.noPictures.length) parts.push(`${summary.noPictures.length} mangler billeder`);
  if (summary.fewPictures.length) parts.push(`${summary.fewPictures.length} mangler pro-billeder`);
  const subtitle = total === 0 ? "Alt er opdateret 🎉" : parts.join(" · ");

  return (
    <div className={cn("flex", className)}>
      <Link
        href="/biler-mangler"
        className="group relative flex min-h-[132px] flex-1 flex-col justify-between gap-4 overflow-hidden rounded-card border border-white/15 p-5 text-white transition-transform duration-200 hover:-translate-y-0.5"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #f97316 100%)",
          boxShadow:
            "0 0 0 1px rgba(249,115,22,0.35), 0 10px 30px -6px rgba(249,115,22,0.45), 0 18px 42px -14px rgba(15,31,51,0.25)",
        }}
      >
        {/* glas-skær, samme mønster som "Godmorgen"-kortet – blot orange */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.28), transparent 55%)",
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Kamera = mangler billeder, flueben-i-kasse = mangler udstyr */}
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <Camera className="size-6" strokeWidth={2} />
            </span>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <SquareCheckBig className="size-6" strokeWidth={2} />
            </span>
          </div>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold tabular-nums ring-1 ring-white/25">
                {total}
              </span>
            )}
            <ArrowUpRight className="size-4 shrink-0 text-white/75 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>

        <div className="relative">
          <p className="text-base font-semibold leading-snug">
            Biler der mangler billeder/udstyr
          </p>
          <p className="mt-1 text-xs text-white/80">{subtitle}</p>
        </div>
      </Link>
    </div>
  );
}
