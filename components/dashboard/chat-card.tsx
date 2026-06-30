"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AssistantChat } from "@/components/agents/assistant-chat";

/**
 * ChatCard – den centrale "Spørg LifeOS om hvad som helst…".
 * FASE 8: chatten virker nu (regelbaseret Chief of Staff). Selve chat-logikken
 * ligger i den genbrugelige AssistantChat; her giver vi den blot kort-rammen.
 */
export function ChatCard() {
  return (
    <Card interactive className="group relative overflow-hidden border-primary/20">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <CardContent className="p-6">
        <AssistantChat />
      </CardContent>
    </Card>
  );
}
