"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail as MailIcon, Settings2, CornerUpLeft } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { getWorkspaceOrder } from "@/features/tasks/section-order";
import { categoryById } from "@/features/integrations/categorize";
import { MailReaderDrawer } from "@/components/mail/mail-reader-drawer";
import type { Workspace } from "@/features/tasks/constants";
import type { MailMessage } from "@/features/integrations/types";

const META: Record<
  Workspace,
  { emoji: string; label: string; provider: string; icon: string; accent: string }
> = {
  work: { emoji: "🚗", label: "Storgaard Biler", provider: "Outlook", icon: "outlook_mail", accent: "var(--brand)" },
  private: { emoji: "🏠", label: "Privat", provider: "Gmail", icon: "gmail", accent: "var(--accent-private)" },
};

/** Kort navn ud fra en e-mailadresse ("info@eventbilletten.dk" → "eventbilletten.dk"). */
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

function MailRow({ mail, onOpen }: { mail: MailMessage; onOpen: (m: MailMessage) => void }) {
  const cat = categoryById(mail.category);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(mail)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(mail)}
      className={cn(
        "flex cursor-pointer items-start gap-3 border-b border-border/50 px-1 py-3.5 transition-colors last:border-0 hover:bg-secondary/30",
        // ULÆST får en diskret farvet baggrund, så læst/ulæst er tydeligt
        // adskilt ved et blik (ud over prikken + den fede skrift nedenfor).
        !mail.isRead && "bg-primary/[0.04]",
      )}
    >
      {/* Læst/ulæst-markør: udfyldt farvet prik = ULÆST, tom ring = læst. */}
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
        <img
          src={`/connectors/${mail.source ?? "gmail"}.svg`}
          alt=""
          className="size-5 object-contain"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p
            className={cn(
              "truncate",
              mail.isRead ? "font-medium text-muted-foreground" : "font-semibold text-foreground",
            )}
          >
            {mail.subject}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDateTime(mail.receivedAt)}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{senderLabel(mail.from)}</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground/80">{mail.snippet}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {mail.replied && (
          <Badge variant="success" className="gap-1 text-[10px]">
            <CornerUpLeft className="size-2.5" />
            Besvaret
          </Badge>
        )}
        {cat && (
          <Badge variant={cat.variant} className="text-[10px]">
            {cat.label}
          </Badge>
        )}
      </div>
    </div>
  );
}

/** Én udbyder-sektion (Outlook/arbejde eller Gmail/privat). */
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
          Ingen mails her endnu. Slå {meta.provider} til under Indstillinger →
          Integrationer.
        </p>
      ) : (
        <Card className="px-4 py-1">
          {mails.map((mail) => (
            <MailRow key={mail.id} mail={mail} onOpen={onOpen} />
          ))}
        </Card>
      )}
    </motion.section>
  );
}

/**
 * MailView – viser mails opdelt i Outlook (Storgaard) og Gmail (Privat).
 * Rækkefølgen følger arbejdstiden (man–fre 9–17, søn 12–16 → Outlook øverst,
 * ellers Gmail øverst) og gentjekkes hvert minut. Læser kun.
 */
export function MailView({
  mails,
  initialOrder,
  openMailId,
}: {
  mails: MailMessage[];
  initialOrder: Workspace[];
  /** Åbn denne mail automatisk ved indlæsning (fx fra faktura-påmindelsen). */
  openMailId?: string;
}) {
  const [order, setOrder] = React.useState<Workspace[]>(initialOrder);
  const [selected, setSelected] = React.useState<MailMessage | null>(null);
  React.useEffect(() => {
    const id = setInterval(() => setOrder(getWorkspaceOrder()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Åbn en bestemt mail, hvis ?abn=<id> peger på en kendt mail.
  React.useEffect(() => {
    if (!openMailId) return;
    const found = mails.find((m) => m.id === openMailId);
    if (found) setSelected(found);
  }, [openMailId, mails]);

  if (mails.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <MailIcon className="size-6" />
        </span>
        <p className="max-w-md text-sm text-muted-foreground">
          Ingen mails endnu. Slå <strong>Gmail</strong> (privat) og{" "}
          <strong>Outlook</strong> (arbejde) til under Indstillinger →
          Integrationer, så samler LifeOS dine vigtigste mails her.
        </p>
        <Link
          href="/indstillinger"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Settings2 className="size-4" />
          Åbn Integrationer
        </Link>
      </Card>
    );
  }

  const byWorld: Record<Workspace, MailMessage[]> = {
    work: mails.filter((m) => m.workspace === "work"),
    private: mails.filter((m) => m.workspace !== "work"),
  };

  return (
    <div className="space-y-4">
      {order.map((workspace) => (
        <MailSection
          key={workspace}
          workspace={workspace}
          mails={byWorld[workspace]}
          onOpen={setSelected}
        />
      ))}
      <p className="px-1 text-xs text-muted-foreground">
        Klik på en mail for at læse den i fuldt format – med billeder og
        vedhæftninger – direkte her i LifeOS.
      </p>
      {selected && (
        // key: ny mail = frisk drawer-state (loading osv. nulstilles ved remount)
        <MailReaderDrawer key={selected.id} mail={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
