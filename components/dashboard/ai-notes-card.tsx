import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/section-card";
import { aiNotes } from "@/features/dashboard/data";

const kindVariant = {
  idé: "default",
  påmindelse: "warning",
  forslag: "success",
} as const;

/**
 * AI-noter – her viser fremtidige AI-agenter idéer, påmindelser og forslag.
 * FASE 5: kun placeholder-tekster. Ingen intelligens endnu.
 */
export function AiNotesCard() {
  return (
    <SectionCard title="AI-noter" icon={Sparkles} href="/ai-assistenter">
      <ul className="flex flex-col gap-3">
        {aiNotes.map((note) => (
          <li key={note.text} className="flex gap-3">
            <Badge variant={kindVariant[note.kind]} className="mt-0.5 shrink-0 capitalize">
              {note.kind}
            </Badge>
            <p className="text-sm text-muted-foreground">{note.text}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
