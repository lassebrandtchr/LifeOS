import type { Priority, Status, Bucket, Workspace } from "@/features/tasks/constants";

/** En opgave, som den ligger i databasen / bruges i UI'et. */
export type Task = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  ai_notes: string | null;
  trade_in: string | null;
  workspace: Workspace;
  category: string | null;
  priority: Priority;
  status: Status;
  bucket: Bucket;
  position: number;
  deadline: string | null;
  reminder_at: string | null;
  project_id: string | null;
  campaign_id: string | null;
  tags: string[];
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  title: string | null;
  body: string | null;
  workspace: Workspace;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  workspace: Workspace;
  status: string;
  deadline: string | null;
  color: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskActivity = {
  id: string;
  task_id: string | null;
  type: "created" | "edited" | "moved" | "completed" | "archived" | string;
  detail: { title?: string; [key: string]: unknown } | null;
  created_at: string;
};

export type TaskHistory = {
  id: string;
  task_id: string | null;
  title: string | null;
  action: string;
  snapshot: Record<string, unknown> | null;
  created_at: string;
};

/** Opgaver grupperet pr. bucket – det board'et tegner. */
export type TasksByBucket = Record<Bucket, Task[]>;
