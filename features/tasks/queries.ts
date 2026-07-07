import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { bucketOrder, type Bucket } from "@/features/tasks/constants";
import type {
  Task,
  Project,
  Note,
  TaskActivity,
  TaskHistory,
  TasksByBucket,
} from "@/features/tasks/types";
import type { Workspace } from "@/features/tasks/constants";

/**
 * Læselag for opgavesystemet.
 *
 * Alle funktioner er robuste: hvis Supabase ikke er sat op endnu, eller hvis
 * databasen mangler tabellerne (migration 0003 ikke kørt), returnerer de tomme
 * lister i stedet for at få siden til at crashe. RLS sørger for, at man kun
 * ser sine egne data.
 */

function emptyBuckets(): TasksByBucket {
  return { today: [], week: [], later: [] };
}

/** Aktive opgaver (ikke færdige/arkiverede), grupperet pr. bucket. */
export async function getTasksByBucket(): Promise<TasksByBucket> {
  if (!isSupabaseConfigured()) return emptyBuckets();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .not("status", "in", "(done,archived)")
      .order("position", { ascending: true });

    if (error || !data) return emptyBuckets();

    const grouped = emptyBuckets();
    for (const task of data as Task[]) {
      const bucket = (bucketOrder as string[]).includes(task.bucket)
        ? (task.bucket as Bucket)
        : "later";
      grouped[bucket].push(task);
    }
    return grouped;
  } catch {
    return emptyBuckets();
  }
}

/** Alle markedsføringsopgaver (kategori markedsføring + sociale medier). */
export async function getMarketingTasks(): Promise<Task[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .in("category", ["markedsfoering", "sociale_medier"])
      .order("position", { ascending: true });
    if (error || !data) return [];
    return data as Task[];
  } catch {
    return [];
  }
}

export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as Project[];
  } catch {
    return [];
  }
}

/** Færdige opgaver (historik) – seneste 12 måneder. */
export async function getHistory(): Promise<TaskHistory[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const since = new Date();
    since.setMonth(since.getMonth() - 12);
    const { data, error } = await supabase
      .from("task_history")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data) return [];
    return data as TaskHistory[];
  } catch {
    return [];
  }
}

export async function getActivity(limit = 50): Promise<TaskActivity[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("task_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as TaskActivity[];
  } catch {
    return [];
  }
}

/** Noter (Second Brain) – nyeste og fastgjorte først. */
export async function getNotes(): Promise<Note[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data as Note[];
  } catch {
    return [];
  }
}

/** Antal færdige opgaver pr. verden (til statistik i sektionerne). */
export async function getCompletedCounts(): Promise<Record<Workspace, number>> {
  const result: Record<Workspace, number> = { work: 0, private: 0 };
  if (!isSupabaseConfigured()) return result;
  try {
    const supabase = await createClient();
    const counts = await Promise.all(
      (["work", "private"] as Workspace[]).map((ws) =>
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "done")
          .eq("workspace", ws),
      ),
    );
    result.work = counts[0].count ?? 0;
    result.private = counts[1].count ?? 0;
    return result;
  } catch {
    return result;
  }
}

/** Et mail-søgehit (let udgave – kun det dropdown'en skal bruge). */
export type EmailHit = {
  id: string;
  subject: string;
  from: string;
  source: string | null;
};

/** Et Notion-søgehit. */
export type NotionHit = {
  id: string;
  title: string;
  url: string | null;
};

export type SearchResults = {
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  emails: EmailHit[];
  notion: NotionHit[];
};

const EMPTY_SEARCH: SearchResults = {
  tasks: [],
  projects: [],
  notes: [],
  emails: [],
  notion: [],
};

/** Filter for opgave-status i global søgning: aktive (ikke færdig/arkiveret) eller afsluttede. */
export type TaskSearchStatus = "active" | "completed";

/** Global søgning på tværs af opgaver, projekter, noter, mails og Notion. */
export async function searchAll(
  query: string,
  taskStatus: TaskSearchStatus = "active",
): Promise<SearchResults> {
  const q = query.trim();
  if (!q || !isSupabaseConfigured()) return EMPTY_SEARCH;
  try {
    const supabase = await createClient();
    const pattern = `%${q}%`;
    let tasksQuery = supabase
      .from("tasks")
      .select("*")
      .or(`title.ilike.${pattern},description.ilike.${pattern}`);
    // "Aktive" matcher samme definition som resten af appen (getTasksByBucket):
    // hverken færdig eller arkiveret. "Afsluttede" er specifikt status "done"
    // (arkiverede regnes ikke med her – det er en anden tilstand end "færdig").
    tasksQuery =
      taskStatus === "completed"
        ? tasksQuery.eq("status", "done")
        : tasksQuery.not("status", "in", "(done,archived)");
    const [tasksRes, projectsRes, notesRes, emailsRes, notionRes] =
      await Promise.all([
        tasksQuery.limit(8),
        supabase.from("projects").select("*").ilike("name", pattern).limit(5),
        supabase
          .from("notes")
          .select("*")
          .or(`title.ilike.${pattern},body.ilike.${pattern}`)
          .limit(5),
        supabase
          .from("emails")
          .select("id, subject, from_addr, source")
          .or(
            `subject.ilike.${pattern},snippet.ilike.${pattern},from_addr.ilike.${pattern}`,
          )
          .order("received_at", { ascending: false, nullsFirst: false })
          .limit(5),
        supabase
          .from("notion_items")
          .select("id, title, url")
          .or(`title.ilike.${pattern},snippet.ilike.${pattern}`)
          .order("edited_at", { ascending: false, nullsFirst: false })
          .limit(5),
      ]);

    return {
      tasks: (tasksRes.data as Task[]) ?? [],
      projects: (projectsRes.data as Project[]) ?? [],
      notes: (notesRes.data as Note[]) ?? [],
      emails:
        (emailsRes.data ?? []).map((r) => ({
          id: r.id as string,
          subject: (r.subject as string | null) ?? "(uden emne)",
          from: (r.from_addr as string | null) ?? "",
          source: (r.source as string | null) ?? null,
        })) ?? [],
      notion:
        (notionRes.data ?? []).map((r) => ({
          id: r.id as string,
          title: (r.title as string | null) ?? "(uden titel)",
          url: (r.url as string | null) ?? null,
        })) ?? [],
    };
  } catch {
    return EMPTY_SEARCH;
  }
}
