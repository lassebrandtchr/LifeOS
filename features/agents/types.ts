import type { Task } from "@/features/tasks/types";
import type {
  MailMessage,
  CalendarEventItem,
} from "@/features/integrations/types";

/**
 * Den fælles kontekst alle agenter ræsonnerer ud fra (læses fra Supabase).
 * Ingen agent ændrer data – de læser kun og foreslår.
 */
export type AssistantContext = {
  tasks: Task[]; // aktive opgaver (ikke færdige/arkiverede)
  emails: MailMessage[]; // synkroniserede mails (Fase 9 – kan være tom)
  calendarEvents: CalendarEventItem[]; // kommende events (Fase 9 – kan være tom)
  counts: {
    total: number;
    today: number;
    urgent: number;
    inProgress: number;
    work: number;
    private: number;
    completedToday: number;
    unreadMail: number;
    upcomingEvents: number;
  };
  notesCount: number;
  projectsCount: number;
};

/** En kort agent-note/forslag (genereres dynamisk ud fra konteksten). */
export type AgentInsight = {
  agentId: string;
  text: string;
};

/** En linje i AI-historikken (gemmes i agent_runs). */
export type AgentRun = {
  id: string;
  agent: string;
  input: { text?: string } | null;
  output: { text?: string } | null;
  created_at: string;
};
