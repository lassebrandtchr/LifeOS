import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  categories,
  priorityOrder,
  priorities,
  type Priority,
} from "@/features/tasks/constants";

/**
 * Stats-datalag til forsiden og Storgaard-siden.
 *
 * Henter opgaverne ÉN gang og udregner alle tal i JavaScript (hurtigt nok til
 * en personlig app). Alt er robust: mangler databasen, returneres nuller, så
 * siderne aldrig crasher. RLS sikrer, at man kun ser sine egne data.
 */

type RawTask = {
  workspace: string;
  category: string | null;
  status: string;
  bucket: string;
  priority: string;
  deadline: string | null;
  completed_at: string | null;
};

const ACTIVE = (t: RawTask) => t.status !== "done" && t.status !== "archived";

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function fetchTasks(): Promise<RawTask[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("workspace, category, status, bucket, priority, deadline, completed_at");
    if (error || !data) return [];
    return data as RawTask[];
  } catch {
    return [];
  }
}

// ── Fælles: færdige opgaver pr. dag/uge ud fra completed_at ──
function completedBuckets(
  tasks: RawTask[],
  unit: "day" | "week",
  count: number,
): { label: string; value: number }[] {
  const done = tasks.filter((t) => t.completed_at);
  const now = new Date();
  const result: { label: string; value: number }[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    let end: Date;
    let label: string;

    if (unit === "day") {
      start.setDate(start.getDate() - i);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = start.toLocaleDateString("da-DK", { weekday: "short" }).replace(".", "");
    } else {
      // mandag-baseret uge
      const dow = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - dow - i * 7);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      label = `u${weekNumber(start)}`;
    }

    const value = done.filter((t) => {
      const c = new Date(t.completed_at as string).getTime();
      return c >= start.getTime() && c < end.getTime();
    }).length;
    result.push({ label, value });
  }
  return result;
}

function weekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return (
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    )
  );
}

// ───────────────────────────── Forside-statistik ─────────────────────────
export type DashboardStats = {
  today: number;
  todayWork: number;
  todayPrivate: number;
  week: number;
  weekWork: number;
  weekPrivate: number;
  overdue: number;
  overdueWork: number;
  overduePrivate: number;
  urgent: number;
  urgentWork: number;
  urgentPrivate: number;
  activeWork: number;
  activePrivate: number;
  doneTotal: number;
  donePrivateThisWeek: number;
  doneThisWeek: number;
  byPriority: { priority: Priority; label: string; count: number }[];
  completed7: { label: string; value: number }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const tasks = await fetchTasks();
  const today0 = startOfToday();
  const active = tasks.filter(ACTIVE);

  const byPriority = priorityOrder.map((p) => ({
    priority: p,
    label: priorities[p].label,
    count: active.filter((t) => t.priority === p).length,
  }));

  const completed7 = completedBuckets(tasks, "day", 7);
  const doneThisWeek = completedBuckets(tasks, "week", 1)[0]?.value ?? 0;

  const isOverdue = (t: RawTask) => !!t.deadline && new Date(t.deadline).getTime() < today0;
  const isUrgent = (t: RawTask) => t.priority === "urgent";
  const isToday = (t: RawTask) => t.bucket === "today";
  const isWeek = (t: RawTask) => t.bucket === "week";
  const work = (t: RawTask) => t.workspace === "work";
  const priv = (t: RawTask) => t.workspace === "private";

  const donePrivateThisWeek = completedBuckets(
    tasks.filter(priv),
    "week",
    1,
  )[0]?.value ?? 0;

  return {
    today: active.filter(isToday).length,
    todayWork: active.filter((t) => isToday(t) && work(t)).length,
    todayPrivate: active.filter((t) => isToday(t) && priv(t)).length,
    week: active.filter(isWeek).length,
    weekWork: active.filter((t) => isWeek(t) && work(t)).length,
    weekPrivate: active.filter((t) => isWeek(t) && priv(t)).length,
    overdue: active.filter(isOverdue).length,
    overdueWork: active.filter((t) => isOverdue(t) && work(t)).length,
    overduePrivate: active.filter((t) => isOverdue(t) && priv(t)).length,
    urgent: active.filter(isUrgent).length,
    urgentWork: active.filter((t) => isUrgent(t) && work(t)).length,
    urgentPrivate: active.filter((t) => isUrgent(t) && priv(t)).length,
    activeWork: active.filter(work).length,
    activePrivate: active.filter(priv).length,
    doneTotal: tasks.filter((t) => t.status === "done").length,
    donePrivateThisWeek,
    doneThisWeek,
    byPriority,
    completed7,
  };
}

// ─────────────────────── Forside: mail + kalender ────────────────────────

export type DashboardEmail = {
  id: string;
  subject: string | null;
  from_addr: string | null;
  snippet: string | null;
  is_read: boolean;
  workspace: string;
  received_at: string | null;
  external_id: string | null;
};

export type DashboardEvent = {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  workspace: string;
  all_day: boolean;
};

export type DashboardData = {
  stats: DashboardStats;
  emails: DashboardEmail[];
  todayEvents: DashboardEvent[];
  tomorrowEvents: DashboardEvent[];
  unreadCount: number;
};

export async function getDashboardData(): Promise<DashboardData> {
  const stats = await getDashboardStats();
  if (!isSupabaseConfigured()) {
    return { stats, emails: [], todayEvents: [], tomorrowEvents: [], unreadCount: 0 };
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  try {
    const supabase = await createClient();
    const [emailsRes, todayEventsRes, tomorrowEventsRes] = await Promise.all([
      supabase
        .from("emails")
        .select("id, subject, from_addr, snippet, is_read, workspace, received_at, external_id")
        .order("received_at", { ascending: false })
        .limit(8),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at, ends_at, workspace, all_day")
        .gte("starts_at", todayStart.toISOString())
        .lt("starts_at", todayEnd.toISOString())
        .order("starts_at", { ascending: true }),
      supabase
        .from("calendar_events")
        .select("id, title, starts_at, ends_at, workspace, all_day")
        .gte("starts_at", todayEnd.toISOString())
        .lt("starts_at", tomorrowEnd.toISOString())
        .order("starts_at", { ascending: true }),
    ]);

    const emails = (emailsRes.data ?? []) as DashboardEmail[];
    const unreadCount = emails.filter((e) => !e.is_read).length;

    return {
      stats,
      emails,
      todayEvents: (todayEventsRes.data ?? []) as DashboardEvent[],
      tomorrowEvents: (tomorrowEventsRes.data ?? []) as DashboardEvent[],
      unreadCount,
    };
  } catch {
    return { stats, emails: [], todayEvents: [], tomorrowEvents: [], unreadCount: 0 };
  }
}

// ─────────────────────────── Storgaard-statistik ─────────────────────────
export type StorgaardStats = {
  totalWork: number;
  activeWork: number;
  doneWork: number;
  leads: number; // åbne kundeopfølgninger
  tilbud: number; // åbne salg/tilbud
  markedsfoering: number; // åbne markedsførings- + SoMe-opgaver
  overdue: number;
  byCategory: { id: string; label: string; emoji: string; value: number }[];
  completed8Weeks: { label: string; value: number }[];
};

export async function getStorgaardStats(): Promise<StorgaardStats> {
  const tasks = await fetchTasks();
  const today0 = startOfToday();
  const work = tasks.filter((t) => t.workspace === "work");
  const activeWork = work.filter(ACTIVE);

  const workCats = categories.filter((c) => c.workspace === "work");
  const byCategory = workCats
    .map((c) => ({
      id: c.id,
      label: c.label,
      emoji: c.emoji,
      value: work.filter((t) => t.category === c.id).length,
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const countActiveCat = (...ids: string[]) =>
    activeWork.filter((t) => t.category && ids.includes(t.category)).length;

  return {
    totalWork: work.length,
    activeWork: activeWork.length,
    doneWork: work.filter((t) => t.status === "done").length,
    leads: countActiveCat("kundeopfoelgning"),
    tilbud: countActiveCat("salg", "finansiering"),
    markedsfoering: countActiveCat("markedsfoering", "sociale_medier"),
    overdue: activeWork.filter(
      (t) => t.deadline && new Date(t.deadline).getTime() < today0,
    ).length,
    byCategory,
    completed8Weeks: completedBuckets(work, "week", 8),
  };
}
