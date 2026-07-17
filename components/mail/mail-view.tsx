"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Mail as MailIcon, Settings2, CornerUpLeft, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { getWorkspaceOrder } from "@/features/tasks/section-order";
import { categoryById } from "@/features/integrations/categorize";
import { MailReaderDrawer } from "@/components/mail/mail-reader-drawer";
import { MailFolders } from "@/components/mail/mail-folders";
import {
  getGmailFolders,
  getFolderEmails,
  moveEmailToFolder,
  recategorizeAllEmails,
  type GmailFolder,
} from "@/features/mail/manage-actions";
import type { Workspace } from "@/features/tasks/constants";
import type { MailMessage } from "@/features/integrations/types";

const META: Record<
  Workspace,
  { emoji: string; label: string; provider: string; icon: string; accent: string }
> = {
  work: { emoji: "🚗", label: "Storgaard Biler", provider: "Outlook", icon: "outlook_mail", accent: "var(--brand)" },
  private: { emoji: "🏠", label: "Privat", provider: "Gmail", icon: "gmail", accent: "var(--accent-private)" },
};

function senderLabel(from: string): string {
  const at = from.indexOf("@");
  return at > -1 ? from.slice(at + 1) : from;
}

function tint(workspace: Workspace) {
  const accent = META[workspace].accent;
  return {
    backgroundColor: `color-mix(in oklab, ${accent} 6%, var(--card))`,
    borderColor: `color-mix(in oklab, ${accent} 22%, var(--border))`,
  };
}

/** Selve rækkens indhold (genbruges i listen OG i drag-overlayet). */
function MailRowContent({ mail }: { mail: MailMessage }) {
  const cat = categoryById(mail.category);
  return (
    <div className="flex items-start gap-3">
      <span className="mt-2 flex w-2 shrink-0 justify-center" aria-hidden>
        {mail.isRead ? (
          <span className="size-2 rounded-full border border-muted-foreground/40" />
        ) : (
          <span className="size-2 rounded-full bg-primary" />
        )}
      </span>
      <span
        aria-hidden
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-white shadow-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/connectors/${mail.source ?? "gmail"}.svg`} alt="" className="size-5 object-contain" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className={cn("truncate", mail.isRead ? "font-medium text-muted-foreground" : "font-semibold text-foreground")}>
            {mail.subject}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(mail.receivedAt)}</span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{senderLabel(mail.from)}</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground/80">{mail.snippet}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {mail.replied && (
          <Badge variant="success" className="gap-1 text-[10px]">
            <CornerUpLeft className="size-2.5" /> Besvaret
          </Badge>
        )}
        {cat && <Badge variant={cat.variant} className="text-[10px]">{cat.label}</Badge>}
      </div>
    </div>
  );
}

/** En trækbar mail-række i indbakken. */
function DraggableMailRow({
  mail,
  onOpen,
  draggable,
}: {
  mail: MailMessage;
  onOpen: (m: MailMessage) => void;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `mail:${mail.id}`,
    data: { mail },
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(mail)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(mail)}
      className={cn(
        "cursor-pointer border-b border-border/50 px-1 py-3.5 transition-colors last:border-0 hover:bg-secondary/30",
        !mail.isRead && "bg-primary/[0.04]",
        isDragging && "opacity-40",
        draggable && "touch-none",
      )}
    >
      <MailRowContent mail={mail} />
    </div>
  );
}

function MailSection({
  workspace,
  mails,
  onOpen,
}: {
  workspace: Workspace;
  mails: MailMessage[];
  onOpen: (m: MailMessage) => void;
}) {
  const meta = META[workspace];
  const unread = mails.filter((m) => !m.isRead).length;
  // Kun Gmail (privat) kan trækkes til Gmail-mapper.
  const draggable = workspace === "private";
  return (
    <motion.section
      layout
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      style={tint(workspace)}
      className="rounded-2xl border p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span aria-hidden className="text-xl">{meta.emoji}</span>
          {meta.label}
          <span className="text-sm font-normal text-muted-foreground">· {meta.provider}</span>
        </h2>
        <span className="rounded-full bg-background/60 px-2.5 py-1 text-xs">
          <span className="font-semibold">{mails.length}</span>{" "}
          <span className="text-muted-foreground">mails</span>
          {unread > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-primary">{unread}</span>{" "}
              <span className="text-muted-foreground">ulæste</span>
            </>
          )}
        </span>
      </div>

      {mails.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
          Ingen mails her endnu. Slå {meta.provider} til under Indstillinger → Integrationer.
        </p>
      ) : (
        <Card className="px-4 py-1">
          {mails.map((mail) => (
            <DraggableMailRow key={mail.id} mail={mail} onOpen={onOpen} draggable={draggable} />
          ))}
        </Card>
      )}
    </motion.section>
  );
}

export function MailView({
  mails,
  initialOrder,
  openMailId,
}: {
  mails: MailMessage[];
  initialOrder: Workspace[];
  openMailId?: string;
}) {
  const router = useRouter();
  const [order, setOrder] = React.useState<Workspace[]>(initialOrder);
  const [selected, setSelected] = React.useState<MailMessage | null>(null);
  const [selectedReadOnly, setSelectedReadOnly] = React.useState(false);

  // Mapper + mappevisning.
  const [folders, setFolders] = React.useState<GmailFolder[]>([]);
  const [foldersLoading, setFoldersLoading] = React.useState(true);
  const [activeFolder, setActiveFolder] = React.useState<GmailFolder | null>(null);
  const [folderMails, setFolderMails] = React.useState<MailMessage[]>([]);
  const [folderLoading, setFolderLoading] = React.useState(false);
  const [recat, setRecat] = React.useState(false);
  const [dragging, setDragging] = React.useState<MailMessage | null>(null);

  // Klik åbner mailen; en lille bevægelses-tærskel skelner klik fra træk.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  React.useEffect(() => {
    const id = setInterval(() => setOrder(getWorkspaceOrder()), 60_000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    let active = true;
    getGmailFolders()
      .then((f) => active && setFolders(f))
      .catch(() => {})
      .finally(() => active && setFoldersLoading(false));
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!openMailId) return;
    const found = mails.find((m) => m.id === openMailId);
    if (found) {
      setSelected(found);
      setSelectedReadOnly(false);
    }
  }, [openMailId, mails]);

  async function openFolder(folder: GmailFolder) {
    setActiveFolder(folder);
    setFolderLoading(true);
    try {
      const list = await getFolderEmails(folder.id);
      setFolderMails(list);
    } catch {
      toast.error("Kunne ikke hente mappens mails.");
    } finally {
      setFolderLoading(false);
    }
  }

  function backToInbox() {
    setActiveFolder(null);
    setFolderMails([]);
  }

  async function handleRecategorize() {
    setRecat(true);
    const res = await recategorizeAllEmails().catch(() => ({ error: "fejl" }));
    setRecat(false);
    if ((res as { error?: string })?.error) {
      toast.error((res as { error?: string }).error ?? "Kunne ikke kategorisere.");
      return;
    }
    const n = (res as { updated?: number }).updated ?? 0;
    toast.success(n > 0 ? `${n} mails fik en ny kategori ✓` : "Alle mails er allerede kategoriseret ✓");
    router.refresh();
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDragging(null);
    const overId = e.over?.id;
    const mail = (e.active.data.current as { mail?: MailMessage } | undefined)?.mail;
    if (!overId || !mail || typeof overId !== "string" || !overId.startsWith("folder:")) return;
    const folderId = overId.slice("folder:".length);
    const folderName =
      (e.over?.data.current as { folderName?: string } | undefined)?.folderName ?? "mappe";

    const res = await moveEmailToFolder(mail.id, folderId).catch(() => ({ error: "fejl" }));
    if ((res as { error?: string })?.error) {
      toast.error((res as { error?: string }).error ?? "Kunne ikke flytte mailen.");
      return;
    }
    toast.success(`Flyttet til "${folderName}" ✓`);
    router.refresh();
  }

  function handleDragStart(e: DragStartEvent) {
    setDragging((e.active.data.current as { mail?: MailMessage } | undefined)?.mail ?? null);
  }

  const byWorld: Record<Workspace, MailMessage[]> = {
    work: mails.filter((m) => m.workspace === "work"),
    private: mails.filter((m) => m.workspace !== "work"),
  };

  const hasInbox = mails.length > 0;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4 lg:flex-row">
        <MailFolders
          folders={folders}
          loading={foldersLoading}
          activeFolderId={activeFolder?.id ?? null}
          onSelectInbox={backToInbox}
          onSelectFolder={openFolder}
        />

        <div className="min-w-0 flex-1 space-y-4">
          {/* Værktøjslinje */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleRecategorize}
              disabled={recat}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-60"
            >
              {recat ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Kategorisér alle
            </button>
          </div>

          {activeFolder ? (
            // ── Mappevisning (live fra Gmail, kun læsning) ──
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={backToInbox}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ArrowLeft className="size-4" /> Indbakke
                </button>
                <h2 className="text-lg font-semibold">{activeFolder.name}</h2>
              </div>
              {folderLoading ? (
                <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Henter mails i mappen …
                </p>
              ) : folderMails.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
                  Ingen mails i denne mappe.
                </p>
              ) : (
                <Card className="px-4 py-1">
                  {folderMails.map((mail) => (
                    <div
                      key={mail.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelected(mail);
                        setSelectedReadOnly(true);
                      }}
                      onKeyDown={(e) =>
                        (e.key === "Enter" || e.key === " ") && (setSelected(mail), setSelectedReadOnly(true))
                      }
                      className="cursor-pointer border-b border-border/50 px-1 py-3.5 transition-colors last:border-0 hover:bg-secondary/30"
                    >
                      <MailRowContent mail={mail} />
                    </div>
                  ))}
                </Card>
              )}
            </div>
          ) : !hasInbox ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
                <MailIcon className="size-6" />
              </span>
              <p className="max-w-md text-sm text-muted-foreground">
                Ingen mails endnu. Slå <strong>Gmail</strong> (privat) og <strong>Outlook</strong>{" "}
                (arbejde) til under Indstillinger → Integrationer.
              </p>
              <Link
                href="/indstillinger"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <Settings2 className="size-4" />
                Åbn Integrationer
              </Link>
            </Card>
          ) : (
            // ── Indbakke-visning (Gmail + Outlook) ──
            <>
              {order.map((workspace) => (
                <MailSection
                  key={workspace}
                  workspace={workspace}
                  mails={byWorld[workspace]}
                  onOpen={(m) => {
                    setSelected(m);
                    setSelectedReadOnly(false);
                  }}
                />
              ))}
              <p className="px-1 text-xs text-muted-foreground">
                Klik på en mail for at læse den i fuldt format. Træk en Gmail-mail hen på en mappe i
                venstre side for at flytte den.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Løftet mail under træk */}
      <DragOverlay>
        {dragging ? (
          <div className="w-[min(28rem,80vw)] rounded-xl border border-primary/40 bg-card p-2 shadow-soft-lg">
            <MailRowContent mail={dragging} />
          </div>
        ) : null}
      </DragOverlay>

      {selected && (
        <MailReaderDrawer
          key={selected.id}
          mail={selected}
          readOnly={selectedReadOnly}
          onClose={() => setSelected(null)}
        />
      )}
    </DndContext>
  );
}
