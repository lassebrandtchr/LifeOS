import { AiWorkspace } from "@/components/agents/ai-workspace";
import { getAgentOverview } from "@/features/agents/queries";

export const metadata = { title: "AI-assistenter" };

/**
 * AI-assistenter – Chief of Staff + de specialiserede agenter.
 * Bygger kontekst på serveren og viser dags-brief, AI-kort, chat og historik.
 * FASE 8: agenterne foreslår – de udfører ingen handlinger.
 */
export default async function AIAssistenterPage() {
  const { insights, brief, runs } = await getAgentOverview();

  return <AiWorkspace insights={insights} brief={brief} runs={runs} />;
}
