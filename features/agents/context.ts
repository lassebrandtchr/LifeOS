import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getMailMessages,
  getCalendarEvents,
} from "@/features/integrations/queries";
import type { Task } from "@/features/tasks/types";
import type { AssistantContext } from "@/features/agents/types";

const EMPTY: AssistantContext = {
  tasks: [],
  emails: [],
  calendarEvents: [],
  counts: {
    total: 0,
    today: 0,
    urgent: 0,
    inProgress: 0,
    work: 0,
    private: 0,
    completedToday: 0,
    unreadMail: 0,
    upcomingEvents: 0,
  },
  notesCount: 0,
  projectsCount: 0,
};

/**
 * Bygger den fælles kontekst, alle agenter ræsonnerer ud fra.
 * Læser kun (RLS sikrer egne data) og er robust: fejler aldrig hårdt.
 */
export async function buildContext(): Promise<AssistantContext> {
  if (!isSupabaseConfigured()) return EMPTY;
  try {
    const supabase = await createClient();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [activeRes, doneTodayRes, notesRes, projectsRes, emails, events] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .not("status", "in", "(done,archived)"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "done")
          .gte("completed_at", startOfDay.toISOString()),
        supabase.from("notes").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        getMailMessages(50),
        getCalendarEvents(50),
      ]);

    const tasks = (activeRes.data as Task[]) ?? [];
    const upcomingEvents = events.filter(
      (e) => e.startsAt && new Date(e.startsAt) >= startOfDay,
    );

    return {
      tasks,
      emails,
      calendarEvents: events,
      counts: {
        total: tasks.length,
        today: tasks.filter((t) => t.bucket === "today").length,
        urgent: tasks.filter((t) => t.priority === "urgent").length,
        inProgress: tasks.filter((t) => t.status === "in_progress").length,
        work: tasks.filter((t) => t.workspace === "work").length,
        private: tasks.filter((t) => t.workspace === "private").length,
        completedToday: doneTodayRes.count ?? 0,
        unreadMail: emails.filter((m) => !m.isRead).length,
        upcomingEvents: upcomingEvents.length,
      },
      notesCount: notesRes.count ?? 0,
      projectsCount: projectsRes.count ?? 0,
    };
  } catch {
    return EMPTY;
  }
}
