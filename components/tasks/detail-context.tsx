"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, StickyNote, FolderKanban, CheckSquare, Type, Car, Bell, Check, UserRound, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AutoGrowTextarea } from "@/components/ui/autogrow-textarea";
import {
  categories,
  priorities,
  priorityOrder,
  workspaces,
  type Workspace,
  type Priority,
  type Bucket,
} from "@/features/tasks/constants";
import { updateTask, updateProjectNotes } from "@/features/tasks/actions";
import { deriveBucketFromDeadline } from "@/features/tasks/bucket";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import { DeadlinePicker } from "@/components/tasks/deadline-picker";
import { RichTextEditor } from "@/components/ui/rich-text-editor/lazy";
import { normalizeCustomer } from "@/features/tasks/customer";
import type { Task, Project, Customer } from "@/features/tasks/types";

export type DetailItem =
  | { type: "task"; task: Task }
  | { type: "project"; project: Project };

type Ctx = { open: (item: DetailItem) => void };
const DetailContext = React.createContext<Ctx>({ open: () => {} });

/** Hook: kald `open(item)` fra et opgave-/projektkort for at åbne detaljen. */
export const useOpenDetail = () => React.useContext(DetailContext);

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const customerInputClass =
  "w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30";

/** ISO → værdi til <input type="datetime-local"> (lokal tid). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * DetailProvider – centreret modal til at REDIGERE en opgave (alle felter:
 * emne, verden, prioritet, status, hvornår, kategori, deadline, note) og
 * vedhæfte filer. Projekter beholder den enkle note-redigering.
 */
export function DetailProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [item, setItem] = React.useState<DetailItem | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Sand mens en sidste gemning kører ved lukning – blokerer for at lukke,
  // indtil alt er gemt.
  const [closing, setClosing] = React.useState(false);
  // Editoren registrerer her en funktion, der gemmer dens nuværende felter
  // FÆRDIGT og returnerer, om det lykkedes. Så kan vi vente på, at alt er
  // gemt, FØR modalen lukkes – uanset luk-metode. (Opgave-editoren har ingen
  // "Gem"-knap; den auto-gemmer løbende + en sidste gang her ved lukning.)
  const flushRef = React.useRef<(() => Promise<boolean>) | null>(null);
  const registerFlush = React.useCallback(
    (fn: (() => Promise<boolean>) | null) => {
      flushRef.current = fn;
    },
    [],
  );

  // Slog den seneste gemning fejl? Så må næste "Luk" ALTID lukke – ellers
  // kunne en telefon uden dækning låse editoren fast (se requestClose).
  const saveFailedRef = React.useRef(false);
  // Er modalen allerede lukket? Bruges til at droppe svaret fra en gemning,
  // der først kommer TILBAGE efter brugeren selv har lukket.
  const closedRef = React.useRef(false);

  const open = React.useCallback((i: DetailItem) => {
    setClosing(false);
    saveFailedRef.current = false;
    closedRef.current = false;
    setItem(i);
  }, []);

  // Luk med det samme + genopfrisk listen, så en ændring (fx flytning mellem
  // Privat/Storgaard) afspejles straks. Bruges når der ALLEREDE er gemt.
  const hardClose = React.useCallback(() => {
    closedRef.current = true;
    flushRef.current = null;
    setClosing(false);
    setItem(null);
    router.refresh();
  }, [router]);

  // Luk-FORSØG: gem evt. ikke-gemte ændringer færdigt, og luk først når det
  // er lykkedes. Fejler gemningen, forbliver modalen åben, så intet tabes –
  // men man kan ALTID komme ud (se de to udveje nedenfor).
  const requestClose = React.useCallback(async () => {
    const flush = flushRef.current;

    // UDVEJ 1 – "Gemmer …" hænger.
    // Trykker man luk IGEN, mens der stadig gemmes, lukker vi med det samme.
    // Her stod før `if (closing) return`, som IGNOREREDE klikket – og hang
    // gemningen (fx en langsom database, der lige er vågnet), stod modalen
    // fast på "Gemmer …" for evigt med alle knapper deaktiveret. Gemningen
    // kører videre i baggrunden; editorens unmount-effekt gemmer også.
    if (closing) {
      hardClose();
      return;
    }

    if (!flush) {
      hardClose();
      return;
    }

    // UDVEJ 2 – gemningen er allerede slået fejl én gang. Så lukker vi nu,
    // uanset hvad, i stedet for at holde brugeren fanget i editoren.
    if (saveFailedRef.current) {
      hardClose();
      return;
    }

    setClosing(true);
    let ok = false;
    try {
      ok = await flush();
    } catch {
      // Netværksfejl: behandl som mislykket gemning i stedet for at lade
      // fejlen boble op – ellers ville `closing` hænge på true for evigt.
      ok = false;
    }

    // Nåede brugeren selv at lukke (UDVEJ 1) mens vi ventede? Så må vi ikke
    // røre state eller vise beskeder for en modal, der ikke er der længere.
    if (closedRef.current) return;

    if (ok) {
      saveFailedRef.current = false;
      hardClose();
      return;
    }

    saveFailedRef.current = true;
    setClosing(false);
    toast.error("Kunne ikke gemme – tjek din forbindelse. Tryk “Luk” igen for at lukke alligevel.");
  }, [closing, hardClose]);

  React.useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, requestClose]);

  return (
    <DetailContext.Provider value={{ open }}>
      {children}

      <AnimatePresence>
        {item && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) void requestClose();
            }}
          >
            <motion.div
              className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-soft-lg"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              {item.type === "task" ? (
                <TaskEditor
                  key={item.task.id}
                  task={item.task}
                  pending={pending}
                  closing={closing}
                  onClose={() => void requestClose()}
                  registerFlush={registerFlush}
                  onMarkDone={(fields) =>
                    startTransition(async () => {
                      // Timeout + try/catch: hænger databasen, ville `pending`
                      // ellers blive stående på true, og ALLE knapper i
                      // editoren ville være deaktiveret for evigt.
                      try {
                        const res = await saveTaskWithTimeout(item.task.id, {
                          ...fields,
                          status: "done",
                        });
                        if (res?.error) toast.error(res.error);
                        else {
                          toast.success("Opgave markeret som færdig ✓");
                          if (res?.warning) toast.warning(res.warning);
                          hardClose(); // allerede gemt → luk direkte
                        }
                      } catch {
                        toast.error("Kunne ikke gemme – tjek din forbindelse.");
                      }
                    })
                  }
                />
              ) : (
                <ProjectEditor
                  key={item.project.id}
                  project={item.project}
                  pending={pending}
                  onClose={() => void requestClose()}
                  onSave={(notes) =>
                    startTransition(async () => {
                      const res = await updateProjectNotes(item.project.id, notes);
                      if (res?.error) toast.error(res.error);
                      else {
                        toast.success("Projekt gemt ✓");
                        hardClose(); // allerede gemt → luk direkte
                      }
                    })
                  }
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DetailContext.Provider>
  );
}

// ─────────────────────────────── Opgave-editor ───────────────────────────

/** Efter så lang tid opgiver vi en gemning og melder fejl i stedet. */
const SAVE_TIMEOUT_MS = 12_000;

/**
 * updateTask, men den kan ALDRIG hænge for evigt.
 *
 * updateTask har allerede en timeout på selve databaseskrivningen, men IKKE på
 * login-tjekket foran den. Er databasen langsom (fx netop vågnet på gratis-
 * planen), kunne kaldet derfor blive hængende uden nogensinde at svare – og så
 * stod editoren fast på "Gemmer …". Her kappes hele kaldet, så vi ALTID får et
 * svar tilbage og kan vise en fejl i stedet for at fryse.
 */
async function saveTaskWithTimeout(
  id: string,
  fields: Parameters<typeof updateTask>[1],
) {
  return Promise.race([
    updateTask(id, fields),
    new Promise<Awaited<ReturnType<typeof updateTask>>>((resolve) =>
      setTimeout(
        () => resolve({ error: "Gemningen tog for lang tid – tjek din forbindelse." }),
        SAVE_TIMEOUT_MS,
      ),
    ),
  ]);
}

type TaskFields = {
  title: string;
  description: string | null;
  workspace: Workspace;
  priority: Priority;
  bucket: Bucket;
  category: string | null;
  deadline: string | null;
  reminder_at: string | null;
  notes: string | null;
  trade_in: string | null;
  customer: Customer | null;
};

function TaskEditor({
  task,
  pending,
  closing,
  onClose,
  registerFlush,
  onMarkDone,
}: {
  task: Task;
  pending: boolean;
  /** Sand mens en sidste gemning kører ved lukning (knapper deaktiveres). */
  closing: boolean;
  onClose: () => void;
  /** Registrér en "gem nuværende felter færdigt"-funktion hos provideren,
   *  så lukningen kan vente på, at alt er gemt. */
  registerFlush: (fn: (() => Promise<boolean>) | null) => void;
  onMarkDone: (fields: TaskFields) => void;
}) {
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description ?? "");
  const [workspace, setWorkspace] = React.useState<Workspace>(
    task.workspace === "work" ? "work" : "private",
  );
  const [priority, setPriority] = React.useState<Priority>(task.priority);
  const [category, setCategory] = React.useState<string>(task.category ?? "");
  const [deadline, setDeadline] = React.useState(isoToLocalInput(task.deadline));
  const [reminderAt, setReminderAt] = React.useState(isoToLocalInput(task.reminder_at));
  const [notes, setNotes] = React.useState(task.notes ?? "");
  const [tradeIn, setTradeIn] = React.useState(task.trade_in ?? "");
  // Kundeinfo – hvert felt for sig (controlled), samles til ét objekt i buildFields.
  const [custName, setCustName] = React.useState(task.customer?.name ?? "");
  const [custPhone, setCustPhone] = React.useState(task.customer?.phone ?? "");
  const [custEmail, setCustEmail] = React.useState(task.customer?.email ?? "");
  const [custAddress, setCustAddress] = React.useState(task.customer?.address ?? "");

  // Salg-opgaver (Bud på bil / Import af bil) bruger Note langt mere end
  // Beskrivelse, og har brug for et separat Byttebil-felt – så her skjules
  // Beskrivelse, Note gøres større, og Byttebil dukker op. Styres af
  // kategorien (ikke en fast oprindelses-markør), så det følger med hvis
  // man selv skifter kategori i editoren.
  const isCarDeal = category === "salg";

  // Kategorierne, der passer til den valgte verden.
  const catOptions = categories.filter((c) => c.workspace === workspace);
  // Skift verden + ryd en kategori, der ikke længere passer (uden effekt).
  function changeWorkspace(ws: Workspace) {
    setWorkspace(ws);
    if (category && !categories.some((c) => c.id === category && c.workspace === ws)) {
      setCategory("");
    }
  }

  // Samler editorens nuværende felter – bruges af auto-gem, flush (gem ved
  // lukning) og "Markér som færdig", så de altid gemmer præcis det samme.
  function buildFields(): TaskFields {
    const deadlineIso = localInputToIso(deadline);
    return {
      title,
      description: description.trim() || null,
      workspace,
      priority,
      // "Hvornår"-feltet er fjernet fra editoren – bucket (i dag/uge/senere)
      // udledes nu altid af deadline, i stedet for at fryse på en gammel
      // manuel værdi, hvis deadline ændres her.
      bucket: deriveBucketFromDeadline(deadlineIso ? new Date(deadlineIso) : null),
      category: category || null,
      deadline: deadlineIso,
      reminder_at: localInputToIso(reminderAt),
      notes: notes.trim() || null,
      trade_in: tradeIn.trim() || null,
      customer: normalizeCustomer({
        name: custName,
        phone: custPhone,
        email: custEmail,
        address: custAddress,
      }),
    };
  }

  // ─── Auto-gem ───────────────────────────────────────────────────────────
  // Gemmer stille i baggrunden 1,2 sek. efter sidste ændring, så ændringer
  // altid er gemt løbende – der er ingen "Gem"-knap længere.
  const [autoSaveState, setAutoSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedJson = React.useRef(JSON.stringify(buildFields()));
  const fieldsRef = React.useRef(buildFields());
  fieldsRef.current = buildFields();

  // Gem editorens nuværende felter FÆRDIGT (afventes). Kaldes af provideren
  // ved lukning, så modalen først lukker, når ALT er gemt. Returnerer true,
  // hvis der ikke er noget nyt at gemme, eller gemningen lykkedes.
  const flush = React.useCallback(async (): Promise<boolean> => {
    const fields = fieldsRef.current;
    // Tom titel gemmes aldrig (ugyldig) – tillad luk; den ugyldige ændring
    // kasseres bare, ligesom auto-gem heller aldrig gemte den.
    if (!fields.title.trim()) return true;
    if (JSON.stringify(fields) === lastSavedJson.current) return true; // intet nyt
    setAutoSaveState("saving");
    // Try/catch: et afbrudt netværkskald må ALDRIG kaste videre herfra –
    // provideren (requestClose) ville så hænge fast i "gemmer"-tilstand.
    // Fejl vises som "error"-tekst i footeren; provideren giver selve
    // fejlbeskeden, så vi undgår to beskeder oven i hinanden.
    try {
      const res = await saveTaskWithTimeout(task.id, fields);
      if (res?.error) {
        setAutoSaveState("error");
        return false;
      }
      lastSavedJson.current = JSON.stringify(fields);
      setAutoSaveState("saved");
      return true;
    } catch {
      setAutoSaveState("error");
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // Registrér flush hos provideren, mens editoren er åben.
  React.useEffect(() => {
    registerFlush(flush);
    return () => registerFlush(null);
  }, [registerFlush, flush]);

  function handleMarkDone() {
    if (!title.trim()) {
      toast.error("Opgaven skal have et emne.");
      return;
    }
    // Sender de nuværende felter med, så evt. ændringer der endnu ikke er
    // auto-gemt ikke går tabt, når opgaven markeres færdig.
    const fields = buildFields();
    lastSavedJson.current = JSON.stringify(fields);
    onMarkDone(fields);
  }

  React.useEffect(() => {
    if (!title.trim()) return; // vent til opgaven har et emne
    const json = JSON.stringify(fieldsRef.current);
    if (json === lastSavedJson.current) return; // ingen reelle ændringer

    const timer = setTimeout(async () => {
      setAutoSaveState("saving");
      const fields = fieldsRef.current;
      // Try/catch: auto-gem kører i baggrunden. Fejler netværket (mobil),
      // vises blot "Kunne ikke gemme – tjek din forbindelse" i footeren, og
      // næste tastetryk forsøger igen. Uden dette blev det en ubehandlet fejl.
      try {
        const res = await saveTaskWithTimeout(task.id, fields);
        if (res?.error) {
          setAutoSaveState("error");
        } else {
          lastSavedJson.current = JSON.stringify(fields);
          setAutoSaveState("saved");
        }
      } catch {
        setAutoSaveState("error");
      }
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, workspace, priority, category, deadline, reminderAt, notes, tradeIn, custName, custPhone, custEmail, custAddress]);

  // Gem med det samme ved unmount (Luk, Escape, klik udenfor, eller skift
  // til en anden opgave), så de sidste ~1,2 sek. af ændringer aldrig når at
  // gå tabt i debounce-vinduet ovenfor.
  React.useEffect(() => {
    return () => {
      const fields = fieldsRef.current;
      if (fields.title.trim() && JSON.stringify(fields) !== lastSavedJson.current) {
        // .catch(): komponenten er ved at forsvinde – en fejl her kan ikke
        // vises nogen steder, men må heller ikke blive en ubehandlet fejl.
        void updateTask(task.id, fields).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoSaveLabel: Record<typeof autoSaveState, string> = {
    idle: "",
    saving: "Gemmer …",
    saved: "Ændringer gemt automatisk",
    error: "Kunne ikke gemme – tjek din forbindelse",
  };

  return (
    <>
      {/* Header (fast) */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <CheckSquare className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight">Rediger opgave</h2>
            <span className="text-xs text-muted-foreground">
              {workspaces[workspace]?.label}
            </span>
          </div>
        </div>
        {/* Heller ikke deaktiveret mens der gemmes – X skal ALTID kunne lukke,
            så en hængende gemning ikke kan spærre brugeren inde. */}
        <button
          onClick={onClose}
          disabled={pending}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
          aria-label="Luk"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Indhold (scroller kun hvis nødvendigt) */}
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {/* Emne – vokser nedad ligesom Note, i stedet for at klippe lange titler af. */}
        <Field label="Emne" icon={Type}>
          <AutoGrowTextarea
            value={title}
            onChange={setTitle}
            placeholder="Hvad skal der ske?"
            className="font-medium"
          />
        </Field>

        {/* Verden */}
        <Field label="Verden">
          <div className="grid grid-cols-2 gap-2">
            <WorldButton active={workspace === "private"} onClick={() => changeWorkspace("private")} label="🏠 Privat" />
            <WorldButton active={workspace === "work"} onClick={() => changeWorkspace("work")} label="🚗 Storgaard" />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prioritet">
            <select className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {priorityOrder.map((p) => (
                <option key={p} value={p}>{priorities[p].emoji} {priorities[p].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Kategori">
            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Ingen</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Påmind mig – samme slags felt som Deadline, men egen (lilla)
            accentfarve, så de to kan skelnes ved et blik. Uafhængig af
            deadline: udløser en global pop op-notifikation på det valgte
            tidspunkt, uanset hvilken side man er på (se ReminderWatcher). */}
        <Field label="Påmind mig" icon={Bell}>
          <DeadlinePicker
            value={reminderAt}
            onChange={setReminderAt}
            accentColor="#a78bfa"
            icon={Bell}
            placeholderText="Sæt en påmindelse"
          />
        </Field>

        <Field label="Deadline">
          <DeadlinePicker value={deadline} onChange={setDeadline} />
        </Field>

        {/* Note – større for Salg-opgaver (Bud på bil/Import af bil), som
            bruger dette felt langt mere end Beskrivelse. */}
        <Field label="Note" icon={StickyNote}>
          <RichTextEditor
            value={notes}
            onChange={setNotes}
            minHeightClassName={isCarDeal ? "min-h-48" : "min-h-20"}
            placeholder="Skriv noter, detaljer, huskepunkter …"
          />
        </Field>

        {/* Kunde – valgfri kontaktinfo. Placeret mellem Note og Byttebil.
            Udfyldes ét eller flere felter, vises en kunde-markør på opgaven
            i Action-listen og på opgavekortet. */}
        <Field label="Kunde" icon={UserRound}>
          <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-3">
            <input
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="Navn"
              autoComplete="off"
              className={customerInputClass}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="Telefon"
                  autoComplete="off"
                  className={cn(customerInputClass, "pl-9")}
                />
              </div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="email"
                  inputMode="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="E-mail"
                  autoComplete="off"
                  className={cn(customerInputClass, "pl-9")}
                />
              </div>
            </div>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <input
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                placeholder="Adresse"
                autoComplete="off"
                className={cn(customerInputClass, "pl-9")}
              />
            </div>
          </div>
        </Field>

        {isCarDeal ? (
          /* Byttebil – fritekst; udfyldt tekst vises som en kort bil-info-
             badge i opgavelisten og Action-listen (features/tasks/trade-in.ts). */
          <Field label="Byttebil" icon={Car}>
            <textarea
              value={tradeIn}
              onChange={(e) => setTradeIn(e.target.value)}
              rows={2}
              placeholder="Har kunden en byttebil? Fx mærke, model, årgang, reg.nr. …"
              className="w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </Field>
        ) : (
          /* Beskrivelse (valgfri) */
          <Field label="Beskrivelse (valgfri)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Kort beskrivelse …"
              className="w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </Field>
        )}

        {/* Vedhæftninger */}
        <TaskAttachments taskId={task.id} />
      </div>

      {/* Footer (fast) */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {task.status !== "done" && (
            <Button
              variant="outline"
              className="text-success border-success/40 hover:bg-success/10"
              onClick={handleMarkDone}
              disabled={pending || closing}
            >
              <Check className="size-4" />
              Markér som færdig
            </Button>
          )}
          {autoSaveLabel[autoSaveState] && (
            <span className="truncate text-xs text-muted-foreground">
              {autoSaveLabel[autoSaveState]}
            </span>
          )}
        </div>
        {/* Ingen "Gem"-knap – ændringer gemmes automatisk løbende, og "Luk"
            venter på, at en sidste gemning er færdig, før den lukker. */}
        <div className="flex shrink-0 gap-2">
          {/* IKKE deaktiveret mens der gemmes. Knappen var før `disabled` når
              closing=true, så hang gemningen, kunne man hverken lukke eller
              trykke sig ud – modalen stod fast på "Gemmer …". Nu kan man altid
              trykke sig ud; status vises i stedet i teksten til venstre. */}
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {closing ? "Luk alligevel" : "Luk"}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────── Projekt-editor ──────────────────────────
function ProjectEditor({
  project,
  pending,
  onClose,
  onSave,
}: {
  project: Project;
  pending: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = React.useState(project.notes ?? "");
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <FolderKanban className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight">{project.name}</h2>
            <span className="text-xs text-muted-foreground">
              Projekt · {workspaces[project.workspace as Workspace]?.label ?? project.workspace}
            </span>
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
          Note
        </label>
        <RichTextEditor
          value={notes}
          onChange={setNotes}
          minHeightClassName="min-h-36"
          placeholder="Skriv noter, detaljer, huskepunkter …"
        />
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 px-5 py-3">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Luk
        </Button>
        <Button onClick={() => onSave(notes)} disabled={pending}>
          {pending ? "Gemmer …" : "Gem note"}
        </Button>
      </div>
    </>
  );
}

// ─────────────────────────────── Små hjælpere ────────────────────────────
function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function WorldButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );
}
