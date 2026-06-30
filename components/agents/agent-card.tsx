import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Agent } from "@/features/agents/registry";

/**
 * AgentCard – ét AI-kort. Viser status, seneste forslag og seneste aktivitet.
 */
export function AgentCard({
  agent,
  insight,
  lastActivity,
}: {
  agent: Agent;
  insight: string;
  lastActivity: string | null;
}) {
  return (
    <Card interactive className="group flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-xl bg-secondary text-xl transition-transform duration-200 group-hover:scale-105"
          >
            {agent.emoji}
          </span>
          <div>
            <h3 className="font-semibold leading-tight">{agent.name}</h3>
            <p className="text-xs text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <Badge variant={agent.live ? "success" : "secondary"} className="shrink-0">
          {agent.live ? "Aktiv" : "Kommer snart"}
        </Badge>
      </div>

      {/* Seneste forslag */}
      <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
        <p className="mb-0.5 text-xs font-medium text-primary">Seneste forslag</p>
        <p className={cn("text-sm", !agent.live && "text-muted-foreground")}>
          {insight || "—"}
        </p>
      </div>

      <p className="mt-auto text-xs text-muted-foreground">
        {lastActivity ? `Seneste aktivitet: ${lastActivity}` : "Ingen aktivitet endnu"}
      </p>
    </Card>
  );
}
