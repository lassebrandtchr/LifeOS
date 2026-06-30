"use client";

import { motion, type Variants } from "framer-motion";

import { Card } from "@/components/ui/card";
import { BriefCard } from "@/components/agents/brief-card";
import { AgentCard } from "@/components/agents/agent-card";
import { AssistantChat } from "@/components/agents/assistant-chat";
import { agents, agentById } from "@/features/agents/registry";
import type { AgentInsight, AgentRun } from "@/features/agents/types";
import type { currentBrief } from "@/features/agents/engine";

/** Chat-scope → hvilket AI-kort aktiviteten hører til. */
const scopeToAgent: Record<string, string> = {
  auto: "chief-of-staff",
  "chief-of-staff": "chief-of-staff",
  private: "home",
  tangevej_94: "home",
  work: "sales",
  marketing: "marketing",
  mail: "mail",
  calendar: "calendar",
  memory: "memory",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "lige nu";
  if (min < 60) return `for ${min} min. siden`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `for ${hours} t. siden`;
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function AiWorkspace({
  insights,
  brief,
  runs,
}: {
  insights: AgentInsight[];
  brief: ReturnType<typeof currentBrief>;
  runs: AgentRun[];
}) {
  const insightFor = (id: string) =>
    insights.find((i) => i.agentId === id)?.text ?? "";

  // Seneste aktivitet pr. AI-kort (ud fra historikken).
  const lastActivity: Record<string, string> = {};
  for (const run of runs) {
    const agentId = scopeToAgent[run.agent] ?? run.agent;
    if (!lastActivity[agentId]) lastActivity[agentId] = relativeTime(run.created_at);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI-assistenter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dine intelligente assistenter. De foreslår og hjælper – men udfører
          aldrig noget uden din godkendelse.
        </p>
      </div>

      <BriefCard brief={brief} />

      {/* Chat */}
      <Card className="p-5 sm:p-6">
        <AssistantChat />
      </Card>

      {/* AI-kort */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {agents.map((agent) => (
          <motion.div key={agent.id} variants={item}>
            <AgentCard
              agent={agent}
              insight={insightFor(agent.id)}
              lastActivity={lastActivity[agent.id] ?? null}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* AI-historik */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">AI-historik</h2>
        {runs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center text-sm text-muted-foreground">
            Ingen samtaler endnu. Stil dit første spørgsmål i chatten ovenfor.
          </div>
        ) : (
          <Card className="divide-y divide-border/50">
            {runs.map((run) => (
              <div key={run.id} className="flex items-start gap-3 p-4">
                <span aria-hidden className="text-lg">
                  {agentById(scopeToAgent[run.agent] ?? "chief-of-staff")?.emoji ?? "🧠"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {run.input?.text ?? "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {run.output?.text}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(run.created_at)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
