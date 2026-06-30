import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildContext } from "@/features/agents/context";
import { generateInsights, currentBrief } from "@/features/agents/engine";
import type { AgentRun, AgentInsight } from "@/features/agents/types";

/** AI-historik (seneste samtaler/kørsler) – gemt i agent_runs. */
export async function getAgentRuns(limit = 30): Promise<AgentRun[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_runs")
      .select("id, agent, input, output, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as AgentRun[];
  } catch {
    return [];
  }
}

/** Bygger kontekst + genererer agent-noter og dags-brief til AI-siden. */
export async function getAgentOverview(): Promise<{
  insights: AgentInsight[];
  brief: ReturnType<typeof currentBrief>;
  runs: AgentRun[];
}> {
  const ctx = await buildContext();
  const runs = await getAgentRuns();
  return {
    insights: generateInsights(ctx),
    brief: currentBrief(ctx),
    runs,
  };
}
