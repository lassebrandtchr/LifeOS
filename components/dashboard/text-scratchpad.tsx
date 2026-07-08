"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, X, Copy, Check, Eraser } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/**
 * TextScratchpad – en simpel "notesblok" der åbnes fra headeren i Hurtige
 * handlinger. Én stor fritekst-boks til hurtigt at skrive/indsætte tekst og
 * kopiere den igen. Teksten gemmes i localStorage, så den ikke går tabt ved
 * navigation eller genindlæsning.
 *
 * VIGTIGT (tema): selve tekstboksen farves med tema-tokens (var(--primary)
 * blandet ind i baggrund/kant). Da tokens skifter pr. data-theme + lys/mørk,
 * skifter boksens farve automatisk med, når Lasse vælger et andet farvetema –
 * uden nogen ekstra kode pr. tema.
 */
const STORAGE_KEY = "lifeos-scratchpad";

export function TextScratchpad() {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // createPortal kræver document – slå til efter mount (undgår SSR-fejl).
  React.useEffect(() => setMounted(true), []);

  // Læs gemt tekst efter mount (undgår hydrerings-mismatch).
  React.useEffect(() => {
    try {
      setText(localStorage.getItem(STORAGE_KEY) ?? "");
    } catch {
      /* localStorage kan være blokeret – så starter vi bare tomt */
    }
  }, []);

  // Gem løbende, så intet går tabt.
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      /* ignorér */
    }
  }, [text]);

  // Escape lukker.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Fokusér boksen når modalen åbner.
  React.useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  async function copyAll() {
    if (!text) {
      toast.error("Der er ingen tekst at kopiere endnu.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback hvis Clipboard-API'et er blokeret: markér + kopiér manuelt.
      textareaRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    toast.success("Teksten er kopieret ✓");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      {/* Trigger-knap – sidder øverst til højre i "Hurtige handlinger". */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-sm font-bold text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/15 hover:shadow-soft"
      >
        <FileText className="size-4 shrink-0" />
        <span className="leading-tight">tekst med fed skrift.</span>
      </button>

      {/* Modalen renderes via portal DIREKTE på <body>, ikke inde i kortet.
          Ellers ville dens position: fixed regne relativt til "Hurtige
          handlinger"-kortet (som har en hover-transform), og modalen ville
          hoppe/flimre hver gang kortet blev animeret. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onMouseDown={(e) =>
                  e.target === e.currentTarget && setOpen(false)
                }
              >
                <motion.div
                  className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-soft-lg"
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                >
                  {/* Header */}
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                        <FileText className="size-4" />
                      </span>
                      <h2 className="text-base font-semibold leading-tight">
                        Tekstboks
                      </h2>
                    </div>
                    <button
                      onClick={() => setOpen(false)}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label="Luk"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Tekstboks – farves efter det valgte tema (se komponent-doc). */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Skriv eller indsæt din tekst her …"
                      spellCheck={false}
                      className="min-h-[45vh] w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/40"
                      style={{
                        backgroundColor:
                          "color-mix(in oklab, var(--primary) 8%, var(--card))",
                        borderColor:
                          "color-mix(in oklab, var(--primary) 40%, var(--border))",
                        color: "var(--foreground)",
                      }}
                    />
                  </div>

                  {/* Footer */}
                  <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
                    <Button
                      variant="ghost"
                      onClick={() => setText("")}
                      disabled={!text}
                      className="text-muted-foreground"
                    >
                      <Eraser className="size-4" />
                      Ryd
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setOpen(false)}>
                        Luk
                      </Button>
                      <Button onClick={copyAll}>
                        {copied ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        {copied ? "Kopieret" : "Kopiér alt"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
