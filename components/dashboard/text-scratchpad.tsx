"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, X, Copy, Check, Eraser } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getScratchpad, saveScratchpad } from "@/features/scratchpad/actions";
import type { ScratchpadRead } from "@/features/scratchpad/actions";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

/**
 * TextScratchpad – en simpel "notesblok" der åbnes fra headeren i Hurtige
 * handlinger. Én stor fritekst-boks til hurtigt at skrive/indsætte tekst og
 * kopiere den igen.
 *
 * SYNKRONISERING (rettet): teksten blev før KUN gemt i localStorage, som er
 * privat pr. browser OG pr. enhed. Derfor var boksen tom på telefonen, selvom
 * der stod tekst på computeren. Nu gemmes teksten i databasen, så den følger
 * med på tværs af enheder. localStorage beholdes som lokal kopi, så teksten
 * vises ØJEBLIKKELIGT (uden at vente på netværket) og overlever offline-brug.
 *
 * VIGTIGT (tema): selve tekstboksen farves med tema-tokens (var(--primary)
 * blandet ind i baggrund/kant). Da tokens skifter pr. data-theme + lys/mørk,
 * skifter boksens farve automatisk med, når Lasse vælger et andet farvetema –
 * uden nogen ekstra kode pr. tema.
 */
const STORAGE_KEY = "lifeos-scratchpad";

/** Vent aldrig i det uendelige på databasen (kan være langsom/vågner op). */
const LOAD_TIMEOUT_MS = 8_000;

export function TextScratchpad() {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  // Først når teksten ÉN gang er hentet, må vi begynde at gemme. Ellers ville
  // en tom boks (før hentningen nåede frem) overskrive den rigtige tekst i
  // databasen – altså slette det, Lasse skrev på en anden enhed.
  const [loaded, setLoaded] = React.useState(false);
  // Sidst kendte værdi i databasen. Bruges til at afgøre, om der er ugemte
  // lokale ændringer, så en genhentning aldrig overskriver noget nyskrevet.
  const syncedRef = React.useRef<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // createPortal kræver document – slå til efter mount (undgår SSR-fejl).
  React.useEffect(() => setMounted(true), []);

  // Hent teksten: lokal kopi først (øjeblikkeligt), derefter databasen.
  React.useEffect(() => {
    let cancelled = false;
    const local = safeGetItem(STORAGE_KEY) ?? "";
    if (local) setText(local); // vis noget med det samme

    (async () => {
      try {
        const res = await Promise.race([
          getScratchpad(),
          new Promise<ScratchpadRead>((r) =>
            setTimeout(() => r({ ok: false }), LOAD_TIMEOUT_MS),
          ),
        ]);
        if (cancelled) return;

        if (!res.ok) {
          // Kunne ikke læse (offline, eller migration 0014 ikke kørt endnu) →
          // kør videre på den lokale kopi, præcis som appen gjorde før.
          return;
        }

        if (res.content === null) {
          // Ingen række i skyen endnu. Har DENNE enhed tekst (fx den gamle
          // tekst fra computeren, som kun lå i localStorage), løftes den op,
          // så den fremover også kan ses på telefonen. Intet slettes.
          if (local) {
            void saveScratchpad(local)
              .then(() => {
                syncedRef.current = local;
              })
              .catch(() => {});
          } else {
            syncedRef.current = "";
          }
          return;
        }

        // Skyen er sandheden – også når den er tom (fx fordi der er trykket
        // "Ryd" på en anden enhed; så skal teksten ikke genopstå her).
        setText(res.content);
        safeSetItem(STORAGE_KEY, res.content);
        syncedRef.current = res.content;
      } catch {
        /* uventet fejl → kør videre på lokal kopi */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Gem løbende: lokalt med det samme, og i databasen kort efter (debounce),
  // så hvert tastetryk ikke bliver et netværkskald.
  React.useEffect(() => {
    if (!loaded) return; // gem ALDRIG før vi har hentet – se kommentar ovenfor
    safeSetItem(STORAGE_KEY, text);
    const timer = setTimeout(() => {
      void saveScratchpad(text)
        .then(() => {
          syncedRef.current = text;
        })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [text, loaded]);

  // Genhent når boksen ÅBNES, så telefonen også fanger tekst, der er skrevet
  // på computeren efter at siden blev indlæst.
  //
  // Vi overskriver KUN, hvis der ikke er ugemte lokale ændringer (dvs. teksten
  // er den samme som sidst synkroniserede værdi) – ellers ville vi kunne
  // slette noget, Lasse lige har skrevet. Ved tvivl vinder den lokale tekst.
  React.useEffect(() => {
    if (!open || !loaded) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await Promise.race([
          getScratchpad(),
          new Promise<ScratchpadRead>((r) =>
            setTimeout(() => r({ ok: false }), LOAD_TIMEOUT_MS),
          ),
        ]);
        if (cancelled || !res.ok || res.content === null) return;
        const remote = res.content;

        setText((current) => {
          const hasUnsavedLocalEdits =
            syncedRef.current !== null && current !== syncedRef.current;
          if (hasUnsavedLocalEdits) return current; // rør den ikke
          syncedRef.current = remote;
          safeSetItem(STORAGE_KEY, remote);
          return remote;
        });
      } catch {
        /* offline → behold den tekst vi har */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

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
        <span className="leading-tight">Tekst med FED skrift</span>
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
                  className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-soft-lg"
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
                        Tekst med FED skrift
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
                      className="min-h-[55vh] w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/40"
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
