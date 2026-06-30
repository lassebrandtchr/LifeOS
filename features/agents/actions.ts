"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildContext } from "@/features/agents/context";
import { answer } from "@/features/agents/engine";
import { scopeById } from "@/features/agents/registry";

/**
 * askAssistant – LifeOS' centrale "spørg om hvad som helst".
 *
 * FASE 8: regelbaseret. Den læser brugerens kontekst, svarer på dansk og
 * gemmer samtalen i agent_runs (AI-historik). Den UDFØRER ingen handlinger –
 * den foreslår kun. (En rigtig sprogmodel kan senere lægges oven på.)
 */
export async function askAssistant(
  scopeId: string,
  question: string,
): Promise<{ answer: string }> {
  const q = question.trim();
  if (!q) return { answer: "Skriv et spørgsmål, så hjælper jeg 🙂" };

  if (!isSupabaseConfigured()) {
    return {
      answer:
        "Jeg er klar, men databasen er ikke koblet på endnu. Når Supabase er sat op, kan jeg svare ud fra dine rigtige opgaver og noter.",
    };
  }

  const scope = scopeById(scopeId);
  const ctx = await buildContext();
  const text = answer(scope.domain, q, ctx);

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

  return { answer: text };
}
