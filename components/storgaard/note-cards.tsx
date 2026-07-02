"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { X, StickyNote, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { saveNoteCard } from "@/features/notes/actions";
import { NoteItemAttachments } from "@/components/storgaard/note-item-attachments";
import type { NoteCardTheme } from "@/config/note-cards";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

type StackItem = { id: string; text: string };

/**
 * "stack"-kasser (Ting til morgenmødet / Torsdag møde) gemmes som en JSON-
 * liste i det SAMME `body`-felt som de almindelige note-kasser bruger til
 * fri tekst – ingen ny kolonne/migration nødvendig. Falder tilbage til at
 * behandle ikke-JSON-indhold som ét enkelt punkt, så intet tabes.
 */
function parseStack(raw: string): StackItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (x): x is StackItem => Boolean(x) && typeof x === "object" && typeof x.text === "string",
      );
    }
  } catch {
    return [{ id: "legacy", text: raw }];
  }
  return [];
}

function stackPreviewText(raw: string): string | null {
  const items = parseStack(raw).filter((i) => i.text.trim());
  if (items.length === 0) return null;
  return items.length === 1 ? items[0].text : `${items.length} ting noteret`;
}

/**
 * Noter – lille Notion-inspireret galleri af faste note-kasser (se
 * config/note-cards.ts). Hver kasse har et "genereret" omslag (farvet
 * gradient + stort ikon, tegnet i CSS i appens egen liquid-glass-stil,
 * IKKE et stockfoto), og åbner en centreret editor ved klik – enten ét
 * stort fritekst-notefelt ("single"), eller en voksende bunke af små,
 * enkeltvist redigerbare/sletbare punkter ("stack"). Gemmes i den
 * eksisterende `notes`-tabel (workspace + title som nøgle).
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
        {cards.map((card) => {
          const preview =
            card.mode === "stack"
              ? stackPreviewText(bodies[card.title] ?? "")
              : bodies[card.title] || null;
          return (
            <motion.button
              key={card.title}
              type="button"
              variants={item}
              onClick={() => setOpenCard(card)}
              className="group flex flex-col overflow-hidden rounded-card border border-border/70 bg-card text-left shadow-soft transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:shadow-soft-lg"
            >
              <NoteCardCover color={card.color} icon={card.icon} />
              <div className="flex flex-1 flex-col gap-1 p-3.5">
                <p className="flex items-center gap-1.5 text-sm font-medium leading-snug">
                  <span aria-hidden>{card.emoji}</span>
                  {card.title}
                </p>
                {preview && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{preview}</p>
                )}
              </div>
            </motion.button>
          );
        })}
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
  const isStack = card.mode === "stack";
  const [text, setText] = React.useState(body);
  const [items, setItems] = React.useState<StackItem[]>(() => parseStack(body));
  const [pending, setPending] = React.useState(false);
  const Icon = card.icon;

  function addItem() {
    setItems((prev) => [{ id: crypto.randomUUID(), text: "" }, ...prev]);
  }
  function updateItem(id: string, next: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, text: next } : it)));
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function handleSave() {
    if (pending) return;
    setPending(true);
    const serialized = isStack
      ? JSON.stringify(items.filter((i) => i.text.trim()))
      : text;
    const res = await saveNoteCard(card.title, card.workspace, serialized);
    setPending(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Note gemt ✓");
    router.refresh();
    onSaved(serialized);
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
          {isStack ? (
            <StackedEditor
              items={items}
              addLabel={card.addLabel ?? "Tilføj"}
              color={card.color}
              onAdd={addItem}
              onChange={updateItem}
              onRemove={removeItem}
            />
          ) : (
            <>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                <StickyNote className="size-4 text-primary" />
                Noter
              </label>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                placeholder="Skriv løs her …"
                className="w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </>
          )}
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

/**
 * Aflangt kassesystem: en "tilføj"-knap øverst, og under den en voksende
 * bunke af små, enkeltvist redigerbare kasser – nyeste øverst ("stables
 * oven på den tidligere"). Sletning popper kassen som en ballon (skalerer
 * kort op og derefter ned til nul, samtidig med at den blegner væk).
 */
function StackedEditor({
  items,
  addLabel,
  color,
  onAdd,
  onChange,
  onRemove,
}: {
  items: StackItem[];
  addLabel: string;
  color: string;
  onAdd: () => void;
  onChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onAdd}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/40"
        style={{
          borderColor: `color-mix(in oklab, ${color} 45%, var(--border))`,
          color,
        }}
      >
        <Plus className="size-4" />
        {addLabel}
      </button>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Ingen punkter endnu – tryk på knappen ovenfor for at tilføje det første.
        </p>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {items.map((it) => (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, scale: 0.85, y: -14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: [1, 1.18, 0],
                  transition: { duration: 0.35, times: [0, 0.4, 1] },
                }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="relative rounded-xl border border-border/60 bg-background p-3 pr-9"
              >
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  aria-label="Slet punkt"
                  className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
                <textarea
                  autoFocus={it.text === ""}
                  value={it.text}
                  onChange={(e) => onChange(it.id, e.target.value)}
                  rows={2}
                  placeholder="Skriv her …"
                  className="w-full resize-y bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70"
                />
                <NoteItemAttachments itemId={it.id} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
