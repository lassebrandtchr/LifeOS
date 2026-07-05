"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildContext } from "@/features/agents/context";
import { answer } from "@/features/agents/engine";
import { scopeById } from "@/features/agents/registry";
import { askClaude, hasClaudeKey, type ChatTurn } from "@/features/agents/claude";

export type AssistantReply = {
  answer: string;
  /** "claude" = rigtig AI (ANTHROPIC_API_KEY sat), "regler" = regelbaseret fallback. */
  engine: "claude" | "regler";
};

/**
 * askAssistant – LifeOS' centrale "spørg om hvad som helst".
 *
 * To lag:
 *  1) Claude (rigtig AI) når ANTHROPIC_API_KEY er sat – får Lasses faktiske
 *     kontekst (opgaver/mails/kalender) + samtalehistorik med.
 *  2) Regelbaseret motor som fallback (ingen nøgle, eller API-fejl) – så
 *     chatten ALTID svarer.
 * Begge lag læser kun; de udfører ingen handlinger.
 */
export async function askAssistant(
  scopeId: string,
  question: string,
  history: ChatTurn[] = [],
): Promise<AssistantReply> {
  const q = question.trim();
  if (!q) return { answer: "Skriv et spørgsmål, så hjælper jeg 🙂", engine: "regler" };

  if (!isSupabaseConfigured()) {
    return {
      answer:
        "Jeg er klar, men databasen er ikke koblet på endnu. Når Supabase er sat op, kan jeg svare ud fra dine rigtige opgaver og noter.",
      engine: "regler",
    };
  }

  const scope = scopeById(scopeId);
  const ctx = await buildContext();

  let text: string;
  let engine: AssistantReply["engine"] = "regler";
  if (hasClaudeKey()) {
    try {
      text = await askClaude(scope.domain, q, ctx, history);
      engine = "claude";
    } catch {
      // API-fejl (net, kvote, nøgle) → regel-motoren tager over, chatten
      // fejler aldrig hårdt.
      text = answer(scope.domain, q, ctx);
    }
  } else {
    text = answer(scope.domain, q, ctx);
  }

  // Gem i AI-historikken (best effort).
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("agent_runs").insert({
        user_id: user.id,
        agent: scope.id,
        status: "done",
        input: { text: q },
        output: { text },
      });
      revalidatePath("/ai-assistenter");
    }
  } catch {
    // historik er ikke kritisk
  }

  return { answer: text, engine };
}
