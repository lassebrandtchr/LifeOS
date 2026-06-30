"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail as MailIcon, Settings2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { getWorkspaceOrder } from "@/features/tasks/section-order";
import { categoryById } from "@/features/integrations/categorize";
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

function MailRow({ mail }: { mail: MailMessage }) {
  const cat = categoryById(mail.category);
  return (
    <div className="flex items-start gap-3 border-b border-border/50 px-1 py-3.5 transition-colors last:border-0 hover:bg-secondary/30">
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
          <p className={cn("truncate font-medium", !mail.isRead && "font-semibold")}>
            {mail.subject}
          </p>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDateTime(mail.receivedAt)}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{senderLabel(mail.from)}</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground/80">{mail.snippet}</p>
      </div>

      {cat && (
        <Badge variant={cat.variant} className="mt-0.5 shrink-0">
          {cat.label}
        </Badge>
      )}
    </div>
  );
}

/** Én udbyder-sektion (Outlook/arbejde eller Gmail/privat). */
function MailSection({
  workspace,
  mails,
}: {
  workspace: Workspace;
  mails: MailMessage[];
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
            <MailRow key={mail.id} mail={mail} />
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
}: {
  mails: MailMessage[];
  initialOrder: Workspace[];
}) {
  const [order, setOrder] = React.useState<Workspace[]>(initialOrder);
  React.useEffect(() => {
    const id = setInterval(() => setOrder(getWorkspaceOrder()), 60_000);
    return () => clearInterval(id);
  }, []);

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
        <MailSection key={workspace} workspace={workspace} mails={byWorld[workspace]} />
      ))}
      <p className="px-1 text-xs text-muted-foreground">
        Rækkefølgen skifter automatisk efter arbejdstid. Mail AI læser og
        prioriterer – den sender eller ændrer aldrig noget uden din godkendelse.
      </p>
    </div>
  );
}
