"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Reply, Send, X, Tag, Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { EmailBody } from "@/components/mail/email-body";
import { categoryById, MAIL_CATEGORIES } from "@/features/integrations/categorize";
import {
  getEmailDetail,
  sendEmailReply,
  setEmailCategory,
  type EmailDetail,
} from "@/features/mail/actions";
import type { MailMessage } from "@/features/integrations/types";

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
}: {
  mail: MailMessage;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [showReply, setShowReply] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [detail, setDetail] = React.useState<EmailDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

  // Kategori-vælger (manuel).
  const [category, setCategory] = React.useState<string | null>(mail.category ?? null);
  const [catOpen, setCatOpen] = React.useState(false);
  const [savingCat, setSavingCat] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    let active = true;
    getEmailDetail(mail.id)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mail.id]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSend() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    const res = await sendEmailReply(mail.id, replyText);
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
    const res = await setEmailCategory(mail.id, next);
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

                {/* Manuel kategori-vælger */}
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
              </div>
              <h2 className="text-lg font-semibold leading-snug [overflow-wrap:anywhere]">
                {mail.subject || "(uden emne)"}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                Fra: <span className="font-medium text-foreground">{mail.from}</span>
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(mail.receivedAt)}</p>
            </div>
            <button
              type="button"
              aria-label="Luk"
              onClick={onClose}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Brødtekst + vedhæftninger – fylder al resterende plads */}
          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Henter mail…
              </div>
            ) : failed || !detail ? (
              <p className="text-sm text-destructive">
                Kunne ikke hente mail-indhold. Tjek at {isWork ? "Outlook" : "Gmail"} er forbundet
                under Indstillinger → Integrationer.
              </p>
            ) : (
              <EmailBody detail={detail} tall />
            )}
          </div>

          {/* Svar */}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
