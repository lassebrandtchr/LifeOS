import { Sparkles } from "lucide-react";

import { siteConfig } from "@/config/site";
import { heroFocus } from "@/features/dashboard/data";

/**
 * WelcomeHero – den intelligente velkomst øverst på dashboardet.
 * Hilsenen er tidsbestemt (beregnes på serveren og sendes som prop), og
 * "vigtigste fokus"-linjen er placeholder, indtil AI'en udfylder den senere.
 */
export function WelcomeHero({
  greeting,
}: {
  greeting: { text: string; emoji: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-white/10 p-6 text-white shadow-soft-lg sm:p-8">
      {/* Gradient-baggrund – elektrisk blå, som logoet */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #4f8dff 100%)",
        }}
      />
      {/* Diskret lysglimt øverst (glas-fornemmelse) + blød cirkel for dybde */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.22), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-10 -top-16 -z-10 size-56 rounded-full bg-white/15 blur-3xl"
      />
      <p className="text-sm font-medium text-white/80">
        {siteConfig.name} · Samlet overblik
      </p>
      <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
        {greeting.text} {siteConfig.owner} {greeting.emoji}
      </h1>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
        <Sparkles className="size-4 shrink-0" />
        <span>{heroFocus}</span>
      </div>
    </div>
  );
}
