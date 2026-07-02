"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { X, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveNoteCard } from "@/features/notes/actions";
import type { NoteCardTheme } from "@/config/note-cards";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

/**
 * Noter – lille Notion-inspireret galleri af faste note-kasser (se
 * config/note-cards.ts). Hver kasse har et "genereret" omslag (farvet
 * gradient + stort ikon, tegnet i CSS i appens egen liquid-glass-stil,
 * IKKE et stockfoto), og åbner en centreret editor med ét stort
 * fritekst-notefelt ved klik. Gemmes i den eksisterende `notes`-tabel
 * (workspace + title som nøgle).
 */
export function NoteCards({
  cards,
  initialBodies,
}: {
  cards: NoteCardTheme[];
  initialBodies: Record<string, string>;
}) {
  const [bodies, setBodies] = React.useState(initialBodies);
  const [openCard, setOpenCard] = React.useState<NoteCardTheme | null>(null);

  React.useEffect(() => {
    if (!openCard) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenCard(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openCard]);

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {cards.map((card) => (
          <motion.button
            key={card.title}
            type="button"
            variants={item}
            onClick={() => setOpenCard(card)}
            className="group flex flex-col overflow-hidden rounded-card border border-border/70 bg-card text-left shadow-soft transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:shadow-soft-lg"
            style={{ borderColor: undefined }}
          >
            <NoteCardCover color={card.color} icon={card.icon} />
            <div className="flex flex-1 flex-col gap-1 p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-medium leading-snug">
                <span aria-hidden>{card.emoji}</span>
                {card.title}
              </p>
              {bodies[card.title] && (
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {bodies[card.title]}
                </p>
              )}
            </div>
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
        {openCard && (
          <NoteEditorModal
            card={openCard}
            body={bodies[openCard.title] ?? ""}
            onClose={() => setOpenCard(null)}
            onSaved={(newBody) => {
              setBodies((prev) => ({ ...prev, [openCard.title]: newBody }));
              setOpenCard(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * "Genereret" omslag – en farvet gradient (afledt af kortets accentfarve,
 * samme color-mix-mønster som resten af appen) med et stort, gennemsigtigt
 * ikon-vandmærke + et blødt lysglimt, så det ligner et bevidst designet
 * cover frem for en flad firkant.
 */
function NoteCardCover({ color, icon: Icon }: { color: string; icon: NoteCardTheme["icon"] }) {
  return (
    <div
      className="relative flex h-24 items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(135deg, color-mix(in oklab, ${color} 32%, var(--card)) 0%, color-mix(in oklab, ${color} 10%, var(--card)) 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute -right-6 -top-8 size-24 rounded-full blur-2xl"
        style={{ backgroundColor: `color-mix(in oklab, ${color} 45%, transparent)` }}
      />
      <Icon
        aria-hidden
        className="relative size-11 transition-transform duration-200 ease-out group-hover:scale-110"
        style={{ color: `color-mix(in oklab, ${color} 75%, white)`, opacity: 0.9 }}
        strokeWidth={1.5}
      />
    </div>
  );
}

function NoteEditorModal({
  card,
  body,
  onClose,
  onSaved,
}: {
  card: NoteCardTheme;
  body: string;
  onClose: () => void;
  onSaved: (body: string) => void;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(body);
  const [pending, setPending] = React.useState(false);
  const Icon = card.icon;

  async function handleSave() {
    if (pending) return;
    setPending(true);
    const res = await saveNoteCard(card.title, card.workspace, value);
    setPending(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Note gemt ✓");
    router.refresh();
    onSaved(value);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-soft-lg"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `color-mix(in oklab, ${card.color} 16%, transparent)`,
                color: card.color,
              }}
            >
              <Icon className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold leading-tight">{card.title}</h2>
              <span className="text-xs text-muted-foreground">Storgaard Biler</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Luk"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
            <StickyNote className="size-4 text-primary" />
            Noter
          </label>
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={14}
            placeholder="Skriv løs her …"
            className="w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Luk
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? "Gemmer …" : "Gem note"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
