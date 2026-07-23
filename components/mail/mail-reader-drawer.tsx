"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2, Reply, Send, X, Tag, Check, CornerUpLeft, Receipt, FileSearch,
  Archive, Trash2, Forward,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { EmailBody } from "@/components/mail/email-body";
import { categoryById, MAIL_CATEGORIES } from "@/features/integrations/categorize";
import {
  getEmailThread,
  getEmailThreadByExternalId,
  sendEmailReply,
  setEmailCategory,
  type EmailThread,
} from "@/features/mail/actions";
import {
  setInvoicePaid,
  setInvoiceDueDate,
  extractInvoiceDueDateFromPdf,
} from "@/features/mail/invoice-actions";
import { archiveEmail, trashEmail, forwardEmail } from "@/features/mail/manage-actions";
import { parseDanishDueDate } from "@/lib/invoice/due-date";
import type { MailMessage } from "@/features/integrations/types";

/** "Karl Hansen <k@x.dk>" → "Karl Hansen"; ellers adressen. */
function senderName(from: string | null): string {
  if (!from) return "Ukendt afsender";
  const m = from.match(/^\s*"?([^"<]+?)"?\s*</);
  return (m ? m[1] : from).trim();
}

/**
 * MailReaderDrawer – fuld mail-læser. Åbner mailen i en STOR, CENTRERET modal
 * midt på skærmen (ikke længere et smalt sidepanel), så tekst- og
 * indholdsområdet er så stort og læsbart som muligt. HTML-brødtekst,
 * inline-billeder og vedhæftninger (EmailBody) vises alt INDE i appen.
 *
 * Kategori kan ændres MANUELT i headeren (fx til Faktura/Kvittering) – det
 * gemmes og spejles til Lasses egen Gmail-label. Svar sendes via
 * sendEmailReply (fra Lasses egen konto, med hans Gmail-signatur).
 */
export function MailReaderDrawer({
  mail,
  onClose,
  readOnly = false,
}: {
  mail: MailMessage;
  onClose: () => void;
  /** Åbnet fra en Gmail-MAPPE (ikke synket indbakke): kun læsning, ingen
   *  handlinger der kræver en database-række (svar/arkivér/kategori/faktura). */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [showReply, setShowReply] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [thread, setThread] = React.useState<EmailThread | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Håndtér-handlinger (arkivér/slet/videresend).
  const [busy, setBusy] = React.useState<null | "archive" | "trash">(null);
  const [showForward, setShowForward] = React.useState(false);
  const [forwardTo, setForwardTo] = React.useState("");
  const [forwardNote, setForwardNote] = React.useState("");
  const [forwarding, setForwarding] = React.useState(false);

  async function handleArchive() {
    setBusy("archive");
    const res = await archiveEmail(mail.id, mail.externalId).catch(() => ({ error: "fejl" }));
    setBusy(null);
    if ((res as { error?: string })?.error) {
      toast.error((res as { error?: string }).error ?? "Kunne ikke arkivere.");
      return;
    }
    toast.success("Mail arkiveret ✓");
    onClose();
    router.refresh();
  }

  async function handleTrash() {
    if (!confirm("Flyt denne mail til Gmails papirkurv?")) return;
    setBusy("trash");
    const res = await trashEmail(mail.id, mail.externalId).catch(() => ({ error: "fejl" }));
    setBusy(null);
    if ((res as { error?: string })?.error) {
      toast.error((res as { error?: string }).error ?? "Kunne ikke slette.");
      return;
    }
    toast.success("Mail flyttet til papirkurv ✓");
    onClose();
    router.refresh();
  }

  async function handleForward() {
    if (!forwardTo.trim() || forwarding) return;
    setForwarding(true);
    const res = await forwardEmail(mail.id, forwardTo, forwardNote, mail.externalId);
    setForwarding(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Mail videresendt ✓");
    setShowForward(false);
    setForwardTo("");
    setForwardNote("");
  }

  // Kategori-vælger (manuel).
  const [category, setCategory] = React.useState<string | null>(mail.category ?? null);
  const [catOpen, setCatOpen] = React.useState(false);
  const [savingCat, setSavingCat] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    let active = true;
    (async () => {
      let t: EmailThread | null = null;
      try {
        t = readOnly
          ? await getEmailThreadByExternalId(mail.externalId ?? mail.id)
          : await getEmailThread(mail.id, mail.externalId);
      } catch {
        t = null;
      }
      // Kunne den fulde mail ikke hentes (fx et forældet DB-id lige efter en
      // baggrunds-synk, eller et for stort svar), så vis ALTID mindst uddraget
      // fra listen – så mailen ALTID kan åbnes, i stedet for en hård fejl.
      if (!t || t.messages.length === 0) {
        t = {
          id: mail.id,
          subject: mail.subject,
          workspace: mail.workspace,
          external_id: mail.externalId,
          repliedByUser: mail.replied,
          messages: [
            {
              messageId: mail.externalId ?? mail.id,
              from: mail.from,
              date: mail.receivedAt,
              fromMe: false,
              bodyHtml: null,
              body:
                mail.snippet ||
                "Kunne ikke hente hele mailen lige nu – prøv igen om lidt.",
              attachments: [],
            },
          ],
        };
      }
      if (!active) return;
      setThread(t);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [mail, readOnly]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSend() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    const res = await sendEmailReply(mail.id, replyText, mail.externalId);
    setSending(false);
    if (res.ok) {
      toast.success("Svar sendt ✓");
      setReplyText("");
      setShowReply(false);
    } else {
      toast.error(res.error ?? "Kunne ikke sende svar");
    }
  }

  async function chooseCategory(next: string | null) {
    setCatOpen(false);
    if (next === category) return;
    const prev = category;
    setCategory(next); // optimistisk
    setSavingCat(true);
    const res = await setEmailCategory(mail.id, next, mail.externalId);
    setSavingCat(false);
    if (res?.error) {
      setCategory(prev); // rul tilbage
      toast.error(res.error);
    } else {
      toast.success(next ? "Kategori opdateret ✓" : "Kategori fjernet");
    }
  }

  const cat = categoryById(category);
  const isWork = mail.workspace === "work";

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-soft-lg"
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    isWork ? "bg-accent-work/15 text-accent-work" : "bg-primary/15 text-primary",
                  )}
                >
                  {isWork ? "Storgaard · Outlook" : "Privat · Gmail"}
                </span>
                {!mail.isRead && (
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    Ulæst
                  </span>
                )}
                {(thread?.repliedByUser || mail.replied) && (
                  <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    <CornerUpLeft className="size-3" />
                    Besvaret
                  </span>
                )}

                {/* Manuel kategori-vælger (kræver DB-række → skjult i mappe-visning) */}
                {!readOnly && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCatOpen((v) => !v)}
                    disabled={savingCat}
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/50 px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    {savingCat ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Tag className="size-3" />
                    )}
                    {cat ? cat.label : "Vælg kategori"}
                  </button>
                  {catOpen && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setCatOpen(false)} />
                      <div className="absolute left-0 top-full z-[61] mt-1 w-48 overflow-hidden rounded-xl border border-border/70 bg-popover p-1 shadow-soft-lg">
                        {MAIL_CATEGORIES.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => chooseCategory(c.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-secondary"
                          >
                            <span className="flex items-center gap-2">
                              <Badge variant={c.variant} className="text-[10px]">
                                {c.label}
                              </Badge>
                            </span>
                            {category === c.id && <Check className="size-3.5 text-primary" />}
                          </button>
                        ))}
                        <div className="my-1 h-px bg-border/60" />
                        <button
                          type="button"
                          onClick={() => chooseCategory(null)}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary"
                        >
                          Ingen kategori
                          {category === null && <Check className="size-3.5 text-primary" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                )}
              </div>
              <h2 className="text-lg font-semibold leading-snug [overflow-wrap:anywhere]">
                {mail.subject || "(uden emne)"}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                Fra: <span className="font-medium text-foreground">{mail.from}</span>
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(mail.receivedAt)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {/* Arkivér / Videresend / Slet – kun for Gmail (privat), og ikke
                  når mailen er åbnet skrivebeskyttet fra en mappe. */}
              {!isWork && !readOnly && (
                <>
                  <button
                    type="button"
                    aria-label="Arkivér"
                    title="Arkivér (fjern fra indbakken)"
                    onClick={handleArchive}
                    disabled={busy !== null}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                  >
                    {busy === "archive" ? <Loader2 className="size-4.5 animate-spin" /> : <Archive className="size-4.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Videresend"
                    title="Videresend"
                    onClick={() => setShowForward((v) => !v)}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Forward className="size-4.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Slet"
                    title="Slet (flyt til papirkurv)"
                    onClick={handleTrash}
                    disabled={busy !== null}
                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    {busy === "trash" ? <Loader2 className="size-4.5 animate-spin" /> : <Trash2 className="size-4.5" />}
                  </button>
                  <span className="mx-1 h-6 w-px bg-border/60" />
                </>
              )}
              <button
                type="button"
                aria-label="Luk"
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Hele samtalen (tråd) – hver besked som sit eget kort. Egne svar
              (fromMe) får en grøn accent, så man tydeligt ser frem-og-tilbag. */}
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Henter samtale…
              </div>
            ) : !thread || thread.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Henter mail-indhold …
              </p>
            ) : (
              thread.messages.map((m, i) => (
                <div
                  key={m.messageId}
                  className={cn(
                    "rounded-2xl border p-4",
                    m.fromMe
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/60 bg-secondary/20",
                  )}
                >
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {m.fromMe && <CornerUpLeft className="size-3.5 text-primary" />}
                      <span className={cn(m.fromMe && "text-primary")}>
                        {m.fromMe ? "Dig" : senderName(m.from)}
                      </span>
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(m.date)}
                    </span>
                  </div>
                  <EmailBody
                    emailId={mail.id}
                    message={m}
                    tall={thread.messages.length === 1}
                  />
                  {i < thread.messages.length - 1 && (
                    <div className="mt-1 h-px bg-transparent" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Videresend-panel */}
          {showForward && !readOnly && (
            <div className="space-y-2 border-t border-border/60 bg-secondary/20 px-5 py-3.5 sm:px-6">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Forward className="size-4 text-primary" />
                Videresend
              </div>
              <input
                type="email"
                value={forwardTo}
                onChange={(e) => setForwardTo(e.target.value)}
                placeholder="Modtagerens e-mail"
                autoComplete="off"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <textarea
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
                placeholder="Tilføj en besked (valgfri) – den originale mail sendes med."
                rows={2}
                className="w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForward(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                >
                  Annullér
                </button>
                <button
                  type="button"
                  onClick={handleForward}
                  disabled={forwarding || !forwardTo.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
                >
                  {forwarding ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Videresend
                </button>
              </div>
            </div>
          )}

          {/* Faktura-panel – kun for mails kategoriseret som 'faktura'. */}
          {mail.category === "faktura" && !readOnly && <InvoicePanel mail={mail} />}

          {/* Svar (skjult i skrivebeskyttet mappe-visning) */}
          {readOnly ? (
            <div className="border-t border-border/60 px-5 py-3 text-center text-xs text-muted-foreground sm:px-6">
              Åbnet fra en mappe – kun læsning. Åbn mailen i indbakken for at
              svare, arkivere eller videresende.
            </div>
          ) : (
          <div className="border-t border-border/60 px-5 py-4 sm:px-6">
            {showReply ? (
              <div className="space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Svar til ${mail.from}… (din Gmail-signatur tilføjes automatisk)`}
                  rows={5}
                  autoFocus
                  className="w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReply(false)}
                    className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                  >
                    Annullér
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !replyText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Send svar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowReply(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <Reply className="size-4" />
                Besvar
              </button>
            )}
          </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

/**
 * InvoicePanel – faktura-styring inde i mailen: forfaldsdato (auto-udledt fra
 * mailteksten, kan hentes fra PDF eller sættes manuelt) + "Markér som betalt".
 * Betalte fakturaer holder op med at give påmindelser (InvoiceReminder).
 */
function InvoicePanel({ mail }: { mail: MailMessage }) {
  const derived = React.useMemo(
    () => parseDanishDueDate(`${mail.subject} ${mail.snippet}`),
    [mail.subject, mail.snippet],
  );
  const [due, setDue] = React.useState<string | null>(mail.invoiceDueDate ?? derived);
  const [dueStored, setDueStored] = React.useState<boolean>(Boolean(mail.invoiceDueDate));
  const [paid, setPaid] = React.useState<boolean>(mail.invoicePaid);
  const [parsing, setParsing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function togglePaid() {
    const next = !paid;
    setPaid(next);
    setSaving(true);
    const res = await setInvoicePaid(mail.id, next);
    setSaving(false);
    if (res?.error) {
      setPaid(!next);
      toast.error(res.error);
    } else {
      toast.success(next ? "Faktura markeret som betalt ✓" : "Markeret som ubetalt");
    }
  }

  async function saveDue(value: string) {
    const iso = value || null;
    setDue(iso);
    setDueStored(Boolean(iso));
    const res = await setInvoiceDueDate(mail.id, iso);
    if (res?.error) toast.error(res.error);
  }

  async function findInPdf() {
    setParsing(true);
    const res = await extractInvoiceDueDateFromPdf(mail.id);
    setParsing(false);
    if (res?.error) {
      toast.error(res.error, { duration: 7000 });
      return;
    }
    if (res?.dueDate) {
      setDue(res.dueDate);
      setDueStored(true);
      toast.success("Forfaldsdato fundet i PDF'en ✓");
    }
  }

  return (
    <div className="border-t border-warning/30 bg-warning/[0.06] px-5 py-3.5 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-warning">
          <Receipt className="size-4" />
          Faktura
        </span>

        <label className="inline-flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Forfald:</span>
          <input
            type="date"
            value={due ?? ""}
            onChange={(e) => saveDue(e.target.value)}
            className="rounded-lg border border-border/60 bg-background px-2 py-1 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          {due && !dueStored && (
            <span className="text-[11px] text-muted-foreground">(udledt – tjek den gerne)</span>
          )}
        </label>

        <button
          type="button"
          onClick={findInPdf}
          disabled={parsing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
        >
          {parsing ? <Loader2 className="size-3.5 animate-spin" /> : <FileSearch className="size-3.5" />}
          Find forfald i PDF
        </button>

        <button
          type="button"
          onClick={togglePaid}
          disabled={saving}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
            paid
              ? "border-success/40 bg-success/10 text-success"
              : "border-border/60 hover:bg-secondary",
          )}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {paid ? "Betalt" : "Markér som betalt"}
        </button>
      </div>
    </div>
  );
}
