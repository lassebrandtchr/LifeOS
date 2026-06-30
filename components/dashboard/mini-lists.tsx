import { CalendarClock, Mail, MapPin } from "lucide-react";

import { SectionCard } from "@/components/dashboard/section-card";
import { formatTime, formatDayHeading } from "@/lib/date";
import type { CalendarEventItem, MailMessage } from "@/features/integrations/types";

/** Kort agenda over kommende aftaler (én verden). */
export function UpcomingEvents({
  events,
  href = "/kalender",
}: {
  events: CalendarEventItem[];
  href?: string;
}) {
  return (
    <SectionCard title="Kommende aftaler" icon={CalendarClock} href={href}>
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Ingen kommende aftaler.
        </p>
      ) : (
        <ul className="divide-y divide-border/50">
          {events.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <div className="w-14 shrink-0 text-right">
                <p className="text-sm font-semibold leading-tight">{formatTime(e.startsAt)}</p>
                <p className="text-[11px] capitalize text-muted-foreground">
                  {formatDayHeading(e.startsAt)}
                </p>
              </div>
              <span aria-hidden className="h-8 w-1 shrink-0 rounded-full bg-primary/70" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                {e.location && (
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {e.location}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/** Kort liste over seneste mails (én verden). */
export function RecentMails({
  mails,
  href = "/mail",
}: {
  mails: MailMessage[];
  href?: string;
}) {
  return (
    <SectionCard title="Seneste mails" icon={Mail} href={href}>
      {mails.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Ingen mails endnu.
        </p>
      ) : (
        <ul className="divide-y divide-border/50">
          {mails.slice(0, 5).map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-white shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/connectors/${m.source ?? "gmail"}.svg`} alt="" className="size-4 object-contain" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${m.isRead ? "font-medium" : "font-semibold"}`}>
                  {m.subject}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.snippet}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
