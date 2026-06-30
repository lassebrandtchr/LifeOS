"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Mail,
  Calendar,
  CalendarClock,
  CalendarRange,
  AlertTriangle,
  Flame,
  Car,
  ArrowUpRight,
  X,
  Send,
  Loader2,
  Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GreetingResult } from "@/features/dashboard/greeting";
import type { DashboardData, DashboardEmail, DashboardEvent } from "@/features/dashboard/stats";
import { siteConfig } from "@/config/site";
import { focusTasks } from "@/features/dashboard/data";
import {
  getEmailDetail,
  sendEmailReply,
  type EmailDetail,
} from "@/features/mail/actions";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtFromAddr(from: string | null): string {
  if (!from) return "Ukendt afsender";
  const match = from.match(/^(.+?)\s*</) ?? from.match(/^([^@]+)/);
  return match ? match[1].replace(/"/g, "").trim() : from;
}

function todayDateStr(): string {
  return new Intl.DateTimeFormat("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// Workspace-badge (grøn = privat, rav = Storgaard/arbejde)
const wsBadge = {
  work: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  private: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

// ─── Dashboard header ─────────────────────────────────────────────────────────

function DashboardHeader({
  greeting,
  isWork,
}: {
  greeting: GreetingResult;
  isWork: boolean;
}) {
  const dateStr = todayDateStr();
  const capitalised = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div
      className="relative overflow-hidden rounded-card border border-white/15 px-6 py-5 text-white shadow-soft-lg sm:px-8 sm:py-6"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #0b3d24 0%, #16a34a 55%, #3ddc84 100%)",
      }}
    >
      {/* glas-skær */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 100% 0%, rgba(255,255,255,0.22), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-10 -top-16 size-56 rounded-full bg-white/20 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white/75">
            {siteConfig.name} · {capitalised}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting.text}, {siteConfig.owner} {greeting.emoji}
          </h1>
        </div>
        <span
          className={cn(
            "mt-1 shrink-0 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur",
            isWork
              ? "bg-amber-300/25 text-amber-50"
              : "bg-white/20 text-white",
          )}
        >
          {isWork ? "🏢 Arbejdstid" : "🏠 Privat tid"}
        </span>
      </div>
    </div>
  );
}

// ─── Day briefing ─────────────────────────────────────────────────────────────

type Breakdown = {
  urgentWork: number;
  urgentPrivate: number;
  overdueWork: number;
  overduePrivate: number;
};

function DayBriefing({
  unread,
  eventCount,
  urgent,
  overdue,
  today,
  isWork,
  breakdown,
}: {
  unread: number;
  eventCount: number;
  urgent: number;
  overdue: number;
  today: number;
  isWork: boolean;
  breakdown?: Breakdown;
}) {
  const bullets: { text: string; tone: "ok" | "warn" | "danger" | "info" }[] = [];

  if (unread > 0)
    bullets.push({ text: `${unread} ulæste mail${unread !== 1 ? "s" : ""} venter`, tone: "info" });
  else
    bullets.push({ text: "Ingen ulæste mails – indbakken er tom", tone: "ok" });

  if (eventCount > 0)
    bullets.push({ text: `${eventCount} ${eventCount === 1 ? "aftale" : "aftaler"} i dag`, tone: "info" });
  else
    bullets.push({ text: "Ingen aftaler registreret i dag", tone: "ok" });

  if (urgent > 0) {
    let detail = "";
    if (breakdown) {
      const parts: string[] = [];
      if (breakdown.urgentWork > 0) parts.push(`${breakdown.urgentWork} arbejde`);
      if (breakdown.urgentPrivate > 0) parts.push(`${breakdown.urgentPrivate} privat`);
      if (parts.length) detail = ` (${parts.join(", ")})`;
    }
    bullets.push({
      text: `${urgent} hasteoppgave${urgent !== 1 ? "r" : ""}${detail} kræver handling`,
      tone: "danger",
    });
  }

  if (overdue > 0) {
    let detail = "";
    if (breakdown) {
      const parts: string[] = [];
      if (breakdown.overdueWork > 0) parts.push(`${breakdown.overdueWork} arbejde`);
      if (breakdown.overduePrivate > 0) parts.push(`${breakdown.overduePrivate} privat`);
      if (parts.length) detail = ` (${parts.join(", ")})`;
    }
    bullets.push({
      text: `${overdue} forfaldne opgave${overdue !== 1 ? "r" : ""}${detail}`,
      tone: "warn",
    });
  }

  if (today > 0)
    bullets.push({ text: `${today} opgave${today !== 1 ? "r" : ""} planlagt til i dag`, tone: "info" });

  if (bullets.filter((b) => b.tone === "danger" || b.tone === "warn").length === 0)
    bullets.push({ text: isWork ? "Alt ser roligt ud – god arbejdsdag!" : "Alt ser roligt ud – nyd aftenen!", tone: "ok" });

  const toneClass = {
    ok: "text-emerald-600 dark:text-emerald-400",
    warn: "text-amber-600 dark:text-amber-400",
    danger: "text-red-500 dark:text-red-400",
    info: "text-teal-600 dark:text-teal-300",
  };
  const dotColor = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-teal-500",
  };

  return (
    <div className="glass-card rounded-card p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {isWork ? "ARBEJDSOVERBLIK" : "AFTENOVERBLIK"}
      </p>
      <div className="space-y-2">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className={cn("size-1.5 shrink-0 rounded-full", dotColor[b.tone])} />
            <span className={cn("text-sm font-medium", toneClass[b.tone])}>{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Email drawer ─────────────────────────────────────────────────────────────

function EmailDrawer({
  email,
  onClose,
}: {
  email: DashboardEmail;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isPending, setIsPending] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showReply, setShowReply] = useState(false);

  // Hent mail-detaljer når drawer åbnes (afbrydes hvis komponenten unmountes)
  useEffect(() => {
    let active = true;
    setIsPending(true);
    setLoadError(false);
    getEmailDetail(email.id)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setIsPending(false);
      });
    return () => {
      active = false;
    };
  }, [email.id]);

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setSendResult(null);
    const result = await sendEmailReply(email.id, replyText);
    setSending(false);
    if (result.ok) {
      setSendResult({ ok: true, msg: "Svar sendt!" });
      setReplyText("");
      setShowReply(false);
    } else {
      setSendResult({ ok: false, msg: result.error ?? "Ukendt fejl" });
    }
  };

  const isWork = email.workspace === "work";
  const body = detail?.body ?? detail?.snippet ?? email.snippet;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="glass-card-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col rounded-l-card border-l">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/40 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  wsBadge[isWork ? "work" : "private"],
                )}
              >
                {isWork ? "Storgaard" : "Privat"}
              </span>
              {!email.is_read && (
                <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  Ulæst
                </span>
              )}
            </div>
            <h2 className="truncate text-base font-semibold leading-snug">
              {email.subject ?? "(uden emne)"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Fra: <span className="font-medium text-foreground">{fmtFromAddr(email.from_addr)}</span>
            </p>
            <p className="text-xs text-muted-foreground">{fmtDate(email.received_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Brødtekst */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Henter mail…
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">Kunne ikke hente mail-indhold.</p>
          ) : body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {body}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Ingen brødtekst tilgængelig.</p>
          )}
        </div>

        {/* Svar */}
        <div className="border-t border-border/40 px-5 py-4">
          {sendResult && (
            <p
              className={cn(
                "mb-3 rounded-lg px-3 py-2 text-sm font-medium",
                sendResult.ok
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {sendResult.msg}
            </p>
          )}

          {showReply ? (
            <div className="space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Svar til ${fmtFromAddr(email.from_addr)}…`}
                rows={5}
                className="w-full resize-none rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSend}
                  disabled={sending || !replyText.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Send svar
                </button>
                <button
                  onClick={() => {
                    setShowReply(false);
                    setSendResult(null);
                  }}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Annuller
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-2 rounded-lg border border-border/60 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <Reply className="size-4" />
              Svar
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Inbox card ───────────────────────────────────────────────────────────────

function InboxCard({
  emails,
  isWork,
  onEmailClick,
}: {
  emails: DashboardEmail[];
  isWork: boolean;
  onEmailClick: (email: DashboardEmail) => void;
}) {
  const sorted = [...emails].sort((a, b) => {
    const preferredWs = isWork ? "work" : "private";
    if (a.workspace === preferredWs && b.workspace !== preferredWs) return -1;
    if (b.workspace === preferredWs && a.workspace !== preferredWs) return 1;
    return 0;
  });
  const shown = sorted.slice(0, 5);
  const unread = emails.filter((e) => !e.is_read).length;

  return (
    <div className="glass-card flex flex-col rounded-card">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
            <Mail className="size-4" />
          </div>
          <span className="font-semibold">Indbakke</span>
          {unread > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {unread}
            </span>
          )}
        </div>
        <Link
          href="/mail"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col divide-y divide-border/30 px-5">
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {isWork ? "Ingen mails synkroniseret endnu" : "Ingen private mails lige nu"}
          </p>
        ) : (
          shown.map((email) => (
            <button
              key={email.id}
              onClick={() => onEmailClick(email)}
              className="-mx-5 px-5 py-3 text-left transition-colors hover:bg-primary/5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "truncate text-sm",
                    !email.is_read ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {fmtFromAddr(email.from_addr)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {email.received_at ? fmtTime(email.received_at) : ""}
                </span>
              </div>
              {email.subject && (
                <p
                  className={cn(
                    "mt-0.5 truncate text-sm",
                    !email.is_read ? "text-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {email.subject}
                </p>
              )}
              <div className="mt-1 flex items-center gap-1">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    wsBadge[email.workspace === "work" ? "work" : "private"],
                  )}
                >
                  {email.workspace === "work" ? "Storgaard" : "Privat"}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="border-t border-border/40 px-5 py-3">
        <Link href="/mail" className="text-xs font-medium text-primary hover:underline">
          Se alle mails →
        </Link>
      </div>
    </div>
  );
}

// ─── Calendar card ────────────────────────────────────────────────────────────

function EventRow({ event }: { event: DashboardEvent }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-12 shrink-0 text-right text-xs font-semibold text-muted-foreground">
        {event.all_day ? "Heldags" : fmtTime(event.starts_at)}
      </div>
      <div
        className={cn(
          "h-4 w-0.5 shrink-0 rounded-full",
          event.workspace === "work" ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
      <span className="truncate text-sm font-medium">{event.title}</span>
    </div>
  );
}

function CalendarCard({
  todayEvents,
  tomorrowEvents,
}: {
  todayEvents: DashboardEvent[];
  tomorrowEvents: DashboardEvent[];
}) {
  return (
    <div className="glass-card flex flex-col rounded-card">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
            <Calendar className="size-4" />
          </div>
          <span className="font-semibold">Kalender</span>
        </div>
        <Link
          href="/kalender"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="flex-1 px-5">
        <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          I dag
        </p>
        {todayEvents.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Ingen aftaler i dag</p>
        ) : (
          <div className="divide-y divide-border/30">
            {todayEvents.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}

        <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          I morgen
        </p>
        {tomorrowEvents.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Ingen aftaler i morgen</p>
        ) : (
          <div className="divide-y divide-border/30">
            {tomorrowEvents.slice(0, 3).map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border/40 px-5 py-3">
        <Link href="/kalender" className="text-xs font-medium text-primary hover:underline">
          Se fuld kalender →
        </Link>
      </div>
    </div>
  );
}

// ─── Task strip ───────────────────────────────────────────────────────────────

type Tile = { label: string; value: number; icon: React.ElementType; color: string; tint: string };

function TaskStrip({
  today,
  week,
  overdue,
  urgent,
}: {
  today: number;
  week: number;
  overdue: number;
  urgent: number;
}) {
  const tiles: Tile[] = [
    { label: "I dag", value: today, icon: CalendarClock, color: "var(--primary)", tint: "color-mix(in oklab, var(--primary) 16%, transparent)" },
    { label: "Denne uge", value: week, icon: CalendarRange, color: "#0d9488", tint: "color-mix(in oklab, #0d9488 16%, transparent)" },
    { label: "Forfaldne", value: overdue, icon: AlertTriangle, color: "var(--destructive)", tint: "color-mix(in oklab, var(--destructive) 16%, transparent)" },
    { label: "Haster", value: urgent, icon: Flame, color: "var(--warning)", tint: "color-mix(in oklab, var(--warning) 16%, transparent)" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.label}
            href="/opgaver"
            className="glass-card flex items-center gap-3 rounded-card px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: t.tint, color: t.color }}
            >
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-xl font-semibold leading-none tabular-nums">{t.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.label}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Storgaard panel ──────────────────────────────────────────────────────────

const toneClass = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-red-500 dark:text-red-400",
  info: "text-teal-600 dark:text-teal-300",
};

function StorgaardPanel({ stats }: { stats: DashboardData["stats"] }) {
  const rows = [
    { label: "Aktive arbejdsopgaver", value: stats.activeWork, tone: stats.activeWork > 5 ? "warn" : "ok" },
    { label: "Haster", value: stats.urgentWork, tone: stats.urgentWork > 0 ? "danger" : "ok" },
    { label: "Forfaldne", value: stats.overdueWork, tone: stats.overdueWork > 0 ? "warn" : "ok" },
    { label: "Færdige denne uge", value: stats.doneThisWeek, tone: "info" },
  ] as const;

  return (
    <div className="glass-card flex flex-col rounded-card">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Car className="size-4" />
          </div>
          <span className="font-semibold">Storgaard Biler</span>
        </div>
        <Link href="/storgaard-biler" className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex-1 divide-y divide-border/30 px-5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-3">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className={cn("text-sm font-semibold", toneClass[r.tone])}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border/40 px-5 py-3">
        <Link href="/storgaard-biler" className="text-xs font-medium text-primary hover:underline">
          Se Storgaard Biler →
        </Link>
      </div>
    </div>
  );
}

// ─── Privat panel ─────────────────────────────────────────────────────────────

function PrivatPanel({ stats }: { stats: DashboardData["stats"] }) {
  const rows = [
    { label: "Aktive private opgaver", value: stats.activePrivate, tone: "info" },
    { label: "Haster", value: stats.urgentPrivate, tone: stats.urgentPrivate > 0 ? "danger" : "ok" },
    { label: "Forfaldne", value: stats.overduePrivate, tone: stats.overduePrivate > 0 ? "warn" : "ok" },
    { label: "Færdige denne uge", value: stats.donePrivateThisWeek, tone: "info" },
  ] as const;

  return (
    <div className="glass-card flex flex-col rounded-card">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span className="text-base">🏠</span>
          </div>
          <span className="font-semibold">Privat</span>
        </div>
        <Link href="/privat" className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex-1 divide-y divide-border/30 px-5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-3">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className={cn("text-sm font-semibold", toneClass[r.tone])}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border/40 px-5 py-3">
        <Link href="/privat" className="text-xs font-medium text-primary hover:underline">
          Se privat →
        </Link>
      </div>
    </div>
  );
}

// ─── Fokus panel ──────────────────────────────────────────────────────────────

const dotClass = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  warning: "bg-amber-400",
  success: "bg-emerald-400",
  danger: "bg-red-400",
} as const;

function FokusPanel({
  openToday,
  doneTotal,
}: {
  openToday: number;
  doneTotal: number;
}) {
  return (
    <div className="glass-card flex flex-col rounded-card">
      <div className="flex items-center border-b border-border/40 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
            <span className="text-base">✅</span>
          </div>
          <span className="font-semibold">Fokus i dag</span>
        </div>
      </div>
      <div className="flex-1 px-5 py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Top prioriteter
        </p>
        <ol className="space-y-3">
          {focusTasks.map((task, i) => (
            <li key={task.title} className="flex items-start gap-3">
              <span className="mt-0.5 w-4 shrink-0 text-sm font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dotClass[task.tone])} />
              <span className="text-sm font-medium leading-snug">{task.title}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">Åbne i dag</p>
            <p className="mt-0.5 text-lg font-semibold text-primary">{openToday}</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">Færdige i alt</p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-600 dark:text-emerald-400">{doneTotal}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-border/40 px-5 py-3">
        <Link href="/opgaver" className="text-xs font-medium text-primary hover:underline">
          Se alle opgaver →
        </Link>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function JarvisDashboard({
  greeting,
  data,
}: {
  greeting: GreetingResult;
  data: DashboardData;
}) {
  const { stats, emails, todayEvents, tomorrowEvents, unreadCount } = data;
  const isWork = greeting.isWorkHours;
  const [selectedEmail, setSelectedEmail] = useState<DashboardEmail | null>(null);

  // I privattid (aften/nat/weekend) viser forsiden KUN private ting –
  // intet om Storgaard Biler / arbejde. I arbejdstid vises alt.
  const visibleEmails = isWork ? emails : emails.filter((e) => e.workspace !== "work");
  const visibleToday = isWork ? todayEvents : todayEvents.filter((e) => e.workspace !== "work");
  const visibleTomorrow = isWork ? tomorrowEvents : tomorrowEvents.filter((e) => e.workspace !== "work");
  const visibleUnread = visibleEmails.filter((e) => !e.is_read).length;

  const view = isWork
    ? {
        today: stats.today,
        week: stats.week,
        overdue: stats.overdue,
        urgent: stats.urgent,
        breakdown: {
          urgentWork: stats.urgentWork,
          urgentPrivate: stats.urgentPrivate,
          overdueWork: stats.overdueWork,
          overduePrivate: stats.overduePrivate,
        } as Breakdown,
        openToday: stats.today,
        doneTotal: stats.doneTotal,
      }
    : {
        today: stats.todayPrivate,
        week: stats.weekPrivate,
        overdue: stats.overduePrivate,
        urgent: stats.urgentPrivate,
        breakdown: undefined,
        openToday: stats.todayPrivate,
        doneTotal: stats.doneTotal,
      };

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4">
        <DashboardHeader greeting={greeting} isWork={isWork} />

        <DayBriefing
          unread={visibleUnread}
          eventCount={visibleToday.length}
          urgent={view.urgent}
          overdue={view.overdue}
          today={view.today}
          isWork={isWork}
          breakdown={view.breakdown}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InboxCard emails={visibleEmails} isWork={isWork} onEmailClick={setSelectedEmail} />
          <CalendarCard todayEvents={visibleToday} tomorrowEvents={visibleTomorrow} />
        </div>

        <TaskStrip
          today={view.today}
          week={view.week}
          overdue={view.overdue}
          urgent={view.urgent}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {isWork ? <StorgaardPanel stats={stats} /> : <PrivatPanel stats={stats} />}
          <FokusPanel openToday={view.openToday} doneTotal={view.doneTotal} />
        </div>
      </div>

      {selectedEmail && (
        <EmailDrawer email={selectedEmail} onClose={() => setSelectedEmail(null)} />
      )}
    </>
  );
}
