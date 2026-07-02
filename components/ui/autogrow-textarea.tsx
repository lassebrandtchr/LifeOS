"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * AutoGrowTextarea – en enkeltlinjet-ser-ud-som-Input tekstboks, der vokser
 * nedad i takt med indholdet (samme idé som Note-feltet), i stedet for at
 * klippe lang tekst af i én fast-højde linje. Bruges til "Emne" i opgave-
 * editoren (den ENE delte editor, som bruges til at oprette/redigere
 * opgaver alle steder i appen).
 */
export function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const resize = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Skal vokse igen når værdien ændrer sig UDEFRA (fx skift til en anden
  // opgave i editoren), ikke kun ved egne keystrokes.
  React.useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      autoFocus={autoFocus}
      className={cn(
        "flex w-full resize-none overflow-hidden rounded-xl border border-input bg-card px-3.5 py-2 text-sm shadow-soft transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:border-ring",
        className,
      )}
    />
  );
}
