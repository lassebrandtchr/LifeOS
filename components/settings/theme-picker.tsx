"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  COLOR_THEMES,
  applyColorTheme,
  isColorThemeId,
  type ColorThemeId,
  type ThemePreview,
} from "@/features/theme/themes";

/**
 * Tema-vælger – små afrundede preview-kasser, én pr. farvetema.
 * Hver kasse viser temaet i BÅDE light (venstre halvdel) og dark (højre
 * halvdel): baggrund, sidebar-stribe, "Goddag"-kassen og et par indholds-
 * linjer, så man kan se stemningen før man vælger.
 *
 * Valget gemmes i localStorage og sættes som data-theme på <html> – et
 * inline-script i app/layout.tsx genskaber det FØR første paint, så der
 * aldrig blinker et forkert tema ved sideindlæsning.
 */
export function ThemePicker() {
  // Læs det aktive tema fra <html> ved mount (sat af inline-scriptet).
  // Lazy initializer frem for useEffect+setState – værdien findes allerede.
  const [active, setActive] = React.useState<ColorThemeId>(() => {
    if (typeof document === "undefined") return "skov";
    const attr = document.documentElement.getAttribute("data-theme");
    return isColorThemeId(attr) ? attr : "skov";
  });

  function choose(id: ColorThemeId) {
    applyColorTheme(id);
    setActive(id);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {COLOR_THEMES.map((theme) => {
        const isActive = theme.id === active;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => choose(theme.id)}
            aria-pressed={isActive}
            className={cn(
              "group relative overflow-hidden rounded-2xl border text-left transition-all",
              isActive
                ? "border-transparent shadow-glow ring-2 ring-ring"
                : "border-border/60 hover:border-ring/50 hover:shadow-soft",
            )}
          >
            {/* Preview: light-halvdel + dark-halvdel side om side */}
            <span className="flex h-20">
              <MiniPreview preview={theme.light} />
              <MiniPreview preview={theme.dark} />
            </span>

            <span className="flex items-center justify-between gap-2 bg-card px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {theme.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {theme.description}
                </span>
              </span>
              {isActive && (
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: theme.light.primary }}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Én halvdel af preview-kassen: mini-sidebar, mini-"Goddag"-kasse og indholdslinjer. */
function MiniPreview({ preview }: { preview: ThemePreview }) {
  return (
    <span
      className="flex flex-1 gap-1 p-1.5"
      style={{ backgroundColor: preview.bg }}
    >
      <span
        className="w-2 shrink-0 rounded-md"
        style={{ backgroundColor: preview.sidebar }}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className="h-5 rounded-md"
          style={{ backgroundImage: preview.hero }}
        />
        <span
          className="flex flex-1 flex-col justify-center gap-1 rounded-md px-1.5"
          style={{ backgroundColor: preview.card }}
        >
          <span
            className="h-1 w-3/4 rounded-full"
            style={{ backgroundColor: preview.primary }}
          />
          <span
            className="h-1 w-1/2 rounded-full opacity-30"
            style={{ backgroundColor: preview.primary }}
          />
        </span>
      </span>
    </span>
  );
}
