import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { AssistantContext } from "@/features/agents/types";
import type { Domain } from "@/features/agents/registry";

/**
 * Claude-laget oven på agent-motoren.
 *
 * Når ANTHROPIC_API_KEY er sat (i Vercel/.env.local), svarer chatten med en
 * rigtig sprogmodel, der får Lasses FAKTISKE kontekst (opgaver, mails,
 * kalender) med i systemprompten. Uden nøgle bruges den regelbaserede motor
 * (features/agents/engine.ts) som hidtil – actions.ts vælger laget.
 */

export function hasClaudeKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ChatTurn = { role: "user" | "assistant"; text: string };

/** Kompakt, læsbar kontekst til systemprompten (cappet, så prompten er lille). */
function renderContext(ctx: AssistantContext): string {
  const lines: string[] = [];

  lines.push(
    `Nøgletal: ${ctx.counts.total} aktive opgaver (${ctx.counts.urgent} haster, ` +
      `${ctx.counts.today} i dag, ${ctx.counts.work} arbejde / ${ctx.counts.private} privat), ` +
      `${ctx.counts.completedToday} fuldført i dag, ${ctx.counts.unreadMail} ulæste mails, ` +
      `${ctx.counts.upcomingEvents} kommende aftaler, ${ctx.notesCount} noter, ${ctx.projectsCount} projekter.`,
  );

  const tasks = ctx.tasks.slice(0, 40);
  if (tasks.length > 0) {
    lines.push("\nAKTIVE OPGAVER:");
    for (const t of tasks) {
      const parts = [
        t.workspace === "work" ? "[Storgaard]" : "[Privat]",
        t.priority === "urgent" ? "HASTER" : t.priority === "important" ? "Vigtigt" : "Kan vente",
        t.title,
        t.deadline ? `(deadline ${t.deadline.slice(0, 16).replace("T", " ")})` : "",
      ];
      lines.push("- " + parts.filter(Boolean).join(" "));
    }
  }

  const mails = ctx.emails.slice(0, 20);
  if (mails.length > 0) {
    lines.push("\nSENESTE MAILS:");
    for (const m of mails) {
      lines.push(
        `- ${m.isRead ? "" : "[ULÆST] "}${m.workspace === "work" ? "[Outlook/arbejde]" : "[Gmail/privat]"} ` +
          `Fra ${m.from}: ${m.subject}`,
      );
    }
  }

  const events = ctx.calendarEvents.slice(0, 15);
  if (events.length > 0) {
    lines.push("\nKOMMENDE KALENDER:");
    for (const e of events) {
      lines.push(`- ${e.startsAt ? e.startsAt.slice(0, 16).replace("T", " ") : "?"}: ${e.title}`);
    }
  }

  return lines.join("\n");
}

const DOMAIN_FOCUS: Record<string, string> = {
  all: "Du er Lasses Chief of Staff med overblik over HELE hans liv.",
  work: "Fokusér på Storgaard Biler (bilforhandler i Bramming): kunder, biler, salg og arbejdsopgaver.",
  private: "Fokusér på privatlivet: hjemmet på Tangevej 94, familie og private gøremål.",
  marketing: "Fokusér på marketing for Storgaard Biler: sociale medier, video-idéer og kampagner.",
  memory: "Fokusér på noter, viden og opsamling – Lasses second brain.",
  mail: "Fokusér på mails: prioritering, opfølgning og hvad der kræver svar.",
  calendar: "Fokusér på kalenderen: aftaler, tid og planlægning.",
};

/**
 * Spørg Claude med Lasses kontekst. Kaster ved API-fejl – kalderen falder
 * tilbage til regel-motoren, så chatten aldrig fejler hårdt.
 */
export async function askClaude(
  domain: Domain,
  question: string,
  ctx: AssistantContext,
  history: ChatTurn[] = [],
): Promise<string> {
  const client = new Anthropic();

  const now = new Date().toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const system = [
    "Du er LifeOS – Lasse Brandt Sylvesters personlige AI-assistent. Lasse ejer",
    "bilforhandleren Storgaard Biler i Bramming og bor på Tangevej 94.",
    DOMAIN_FOCUS[domain] ?? DOMAIN_FOCUS.all,
    "",
    "Regler:",
    "- Svar ALTID på dansk, kortfattet og konkret (typisk 2-6 sætninger eller en kort punktliste).",
    "- Baser dine svar på konteksten nedenfor – Lasses rigtige opgaver, mails og kalender.",
    "- Du kan KUN rådgive og prioritere; du kan ikke udføre handlinger (oprette/ændre noget). Sig det ærligt, hvis Lasse beder om en handling.",
    "- Nævn konkrete opgaver/mails ved navn, når det er relevant.",
    "",
    `Lige nu er det ${now}.`,
    "",
    "=== LASSES AKTUELLE KONTEKST ===",
    renderContext(ctx),
  ].join("\n");

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-10).map((t) => ({
      role: t.role,
      content: t.text,
    })),
    { role: "user" as const, content: question },
  ];

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    // Adaptiv tænkning: modellen tænker kun når spørgsmålet kræver det –
    // lav effort holder svartiden nede for en chat.
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system,
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Tomt svar fra Claude");
  return text;
}
