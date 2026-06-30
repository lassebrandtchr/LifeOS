import Link from "next/link";
import { Zap } from "lucide-react";

import { SectionCard } from "@/components/dashboard/section-card";
import { quickActions } from "@/features/dashboard/data";

/**
 * Hurtige handlinger – genveje til at oprette nyt indhold.
 * Hver genvej har sin egen unikke farve, så kortet er levende og let at scanne.
 */
export function QuickActionsCard() {
  return (
    <SectionCard title="Hurtige handlinger" icon={Zap}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const color = action.color;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group relative flex flex-col items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-border/60 bg-secondary/30 p-4 text-center transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/30 hover:bg-secondary hover:shadow-soft"
            >
              <span
                className="flex size-11 items-center justify-center rounded-xl transition-transform duration-200 ease-out group-hover:scale-110"
                style={{
                  backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
                  color,
                }}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-medium">{action.label}</span>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"
                style={{ backgroundColor: color }}
              />
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}
