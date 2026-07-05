"use client";

import * as React from "react";
import { Loader2, Reply, Send, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { EmailBody } from "@/components/mail/email-body";
import { categoryById } from "@/features/integrations/categorize";
import {
  getEmailDetail,
  sendEmailReply,
  type EmailDetail,
} from "@/features/mail/actions";
import type { MailMessage } from "@/features/integrations/types";

/**
 * MailReaderDrawer – fuld mail-læser til /mail-siden. Åbner mailen i et
 * panel i højre side med HTML-brødtekst, inline-billeder og vedhæftninger
 * (EmailBody) – alt læses INDE i appen, intet link ud til Gmail/Outlook.
 * Svar sendes via den eksisterende sendEmailReply-action.
 */
export function MailReaderDrawer({
  mail,
  onClose,
}: {
  mail: MailMessage;
  onClose: () => void;
}) {
  // Al hentnings-state bor i indholdskomponenten, som remountes via
  // key={mail.id} – så nulstilles loading/detail helt uden synkrone
  // setState-kald i en effect (react-hooks/set-state-in-effect).
  const [showReply, setShowReply] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [detail, setDetail] = React.useState<EmailDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

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

  // Luk med Escape – hurtig navigation når man læser mange mails.
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

  const cat = categoryById(mail.category);
  const isWork = mail.workspace === "work";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass-card-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col rounded-l-card border-l">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/40 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  isWork
                    ? "bg-accent-work/15 text-accent-work"
                    : "bg-primary/15 text-primary",
                )}
              >
                {isWork ? "Storgaard · Outlook" : "Privat · Gmail"}
              </span>
              {cat && (
                <Badge variant={cat.variant} className="text-[10px]">
                  {cat.label}
                </Badge>
              )}
              {!mail.isRead && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  Ulæst
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold leading-snug">
              {mail.subject || "(uden emne)"}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              Fra: <span className="font-medium text-foreground">{mail.from}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(mail.receivedAt)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Luk"
            onClick={onClose}
            className="ml-3 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Brødtekst + vedhæftninger */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Henter mail…
            </div>
          ) : failed || !detail ? (
            <p className="text-sm text-destructive">
              Kunne ikke hente mail-indhold. Tjek at {isWork ? "Outlook" : "Gmail"} er
              forbundet under Indstillinger → Integrationer.
            </p>
          ) : (
            <EmailBody detail={detail} />
          )}
        </div>

        {/* Svar */}
        <div className="border-t border-border/40 px-5 py-4">
          {showReply ? (
            <div className="space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Svar til ${mail.from}…`}
                rows={4}
                autoFocus
                className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
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
                  {sending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
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
      </div>
    </>
  );
}
