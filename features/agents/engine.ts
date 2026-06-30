import { agents, type Domain } from "@/features/agents/registry";
import { categoryById } from "@/features/tasks/constants";
import type { Task } from "@/features/tasks/types";
import type { AssistantContext, AgentInsight } from "@/features/agents/types";

/**
 * Ræsonneringsmotoren bag LifeOS' agenter.
 *
 * BEVIDST REGELBASERET (ikke en LLM): den læser brugerens rigtige data og
 * svarer hurtigt på dansk. Ren funktion → kan bruges på server og i browser.
 * Arkitekturen er klar til, at en rigtig sprogmodel senere kan kobles på som
 * et ekstra lag oven på den samme kontekst.
 */

const LIVE_DOMAINS: Domain[] = [
  "all",
  "work",
  "private",
  "marketing",
  "memory",
  "mail",
  "calendar",
];

/** Kort dato/tid på dansk (fx "tor. 14:30"). Robust over for null. */
function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tasksForDomain(domain: Domain, ctx: AssistantContext): Task[] {
  switch (domain) {
    case "work":
      return ctx.tasks.filter((t) => t.workspace === "work");
    case "private":
      return ctx.tasks.filter((t) => t.workspace === "private");
    case "marketing":
      return ctx.tasks.filter(
        (t) =>
          t.workspace === "work" &&
          (t.category === "markedsfoering" || t.category === "sociale_medier"),
      );
    default:
      return ctx.tasks;
  }
}

function bullet(tasks: Task[], max = 5): string {
  return tasks
    .slice(0, max)
    .map((t) => {
      const cat = categoryById(t.category);
      const tag = cat ? ` (${cat.label})` : "";
      return `• ${t.title}${tag}`;
    })
    .join("\n");
}

const NOT_LIVE_MSG =
  "Det område er ikke koblet på data endnu – det kommer i en senere fase. Indtil da kan jeg hjælpe med dine opgaver, projekter og noter. Prøv fx “Hvad er vigtigst i dag?”";

/**
 * Mail AI – læser de synkroniserede mails og foreslår. Sender/sletter ALDRIG.
 * Tom tilstand guider Lasse til at forbinde Gmail i Integration Center.
 */
function answerMail(ctx: AssistantContext): string {
  const mails = ctx.emails;
  if (mails.length === 0) {
    return "Der er ingen mails endnu. Slå Gmail til under Indstillinger → Integrationer, så henter jeg dine vigtigste mails ind. Jeg sender eller sletter aldrig noget selv – jeg prioriterer og foreslår.";
  }
  const unread = mails.filter((m) => !m.isRead);
  const show = (unread.length ? unread : mails).slice(0, 5);
  const lines = [
    `Du har ${mails.length} mail${mails.length === 1 ? "" : "s"} indlæst, heraf ${unread.length} ulæst${unread.length === 1 ? "" : "e"}.`,
    "\n" +
      show
        .map((m) => `• ${m.subject}${m.from ? ` — ${m.from}` : ""}`)
        .join("\n"),
    "\nJeg kan prioritere dem og foreslå opfølgning – men sender aldrig selv.",
  ];
  return lines.join("\n");
}

/**
 * Calendar AI – læser kommende events og giver overblik. Ændrer ALDRIG noget.
 */
function answerCalendar(ctx: AssistantContext): string {
  const events = ctx.calendarEvents.filter((e) => e.startsAt);
  if (events.length === 0) {
    return "Der er ingen kalender forbundet endnu. Slå Google Kalender til under Indstillinger → Integrationer, så samler jeg dine aftaler her og hjælper dig med at planlægge.";
  }
  const now = Date.now();
  const upcoming = events.filter(
    (e) => new Date(e.startsAt as string).getTime() >= now - 3_600_000,
  );
  const list = (upcoming.length ? upcoming : events).slice(0, 5);
  return [
    `Du har ${ctx.counts.upcomingEvents} kommende begivenhed${ctx.counts.upcomingEvents === 1 ? "" : "er"}.`,
    "\n" +
      list
        .map((e) => {
          const when = formatWhen(e.startsAt);
          const where = e.location ? ` · ${e.location}` : "";
          return `• ${when ? `${when} – ` : ""}${e.title}${where}`;
        })
        .join("\n"),
  ].join("\n");
}

/**
 * Besvarer et spørgsmål inden for et domæne ud fra konteksten.
 */
export function answer(
  domain: Domain,
  question: string,
  ctx: AssistantContext,
): string {
  if (!LIVE_DOMAINS.includes(domain)) return NOT_LIVE_MSG;

  if (domain === "memory") {
    return ctx.notesCount === 0
      ? "Du har ingen noter gemt endnu. Læg din første idé eller observation under Opgaver → Noter, så husker jeg den."
      : `Du har ${ctx.notesCount} note${ctx.notesCount === 1 ? "" : "r"} i dit second brain. Brug søgningen i toppen for at finde en bestemt – fx et stelnummer eller en idé.`;
  }

  if (domain === "mail") return answerMail(ctx);
  if (domain === "calendar") return answerCalendar(ctx);

  const tasks = tasksForDomain(domain, ctx);
  const urgent = tasks.filter((t) => t.priority === "urgent");
  const today = tasks.filter((t) => t.bucket === "today");
  const q = question.toLowerCase();

  const scopeLabel =
    domain === "work"
      ? " for Storgaard Biler"
      : domain === "private"
        ? " privat"
        : domain === "marketing"
          ? " inden for markedsføring"
          : "";

  // Intention: hvad haster / hvad er vigtigst
  if (/vigtig|haster|haste|først/.test(q)) {
    if (urgent.length > 0) {
      return `Det vigtigste${scopeLabel} lige nu er ${urgent.length} hasteopgave${urgent.length === 1 ? "" : "r"}:\n\n${bullet(urgent)}`;
    }
    if (today.length > 0) {
      return `Ingen hasteopgaver${scopeLabel} – godt arbejde 🎉 Men du har ${today.length} opgave${today.length === 1 ? "" : "r"} i dag:\n\n${bullet(today)}`;
    }
    return `Du har ingen hasteopgaver eller opgaver i dag${scopeLabel}. Rolig dag ✨`;
  }

  // Intention: hvad mangler jeg / har jeg glemt
  if (/mangl|glemt|overs|tilbage/.test(q)) {
    if (today.length === 0 && urgent.length === 0) {
      return `Du ser ud til at være ajour${scopeLabel} – intet udestående i dag 👍`;
    }
    return `Du mangler at få styr på ${today.length} opgave${today.length === 1 ? "" : "r"} i dag${scopeLabel}${urgent.length ? `, heraf ${urgent.length} der haster` : ""}:\n\n${bullet(today.length ? today : urgent)}`;
  }

  // Intention: hvad skal jeg fokusere på
  if (/fokus|fokuser|koncentr/.test(q)) {
    const list = urgent.length ? urgent : today;
    if (list.length === 0)
      return `Der er intet presserende${scopeLabel} lige nu – brug tiden på det, der giver mest værdi.`;
    return `Fokusér${scopeLabel} på${urgent.length ? " (det haster)" : ""}:\n\n${bullet(list, 3)}`;
  }

  // Standard: overblik
  const parts: string[] = [
    `Overblik${scopeLabel}: ${tasks.length} aktive opgave${tasks.length === 1 ? "" : "r"}, ${today.length} i dag, ${urgent.length} der haster.`,
  ];
  if (today.length) parts.push(`\nI dag:\n${bullet(today, 4)}`);
  else if (urgent.length) parts.push(`\nHaster:\n${bullet(urgent, 4)}`);
  return parts.join("\n");
}

/**
 * Genererer korte agent-noter/forslag ud fra konteksten (vises på AI-kortene).
 */
export function generateInsights(ctx: AssistantContext): AgentInsight[] {
  const work = ctx.tasks.filter((t) => t.workspace === "work");
  const priv = ctx.tasks.filter((t) => t.workspace === "private");
  const followUps = work.filter((t) => t.category === "kundeopfoelgning").length;
  const marketing = work.filter(
    (t) => t.category === "markedsfoering" || t.category === "sociale_medier",
  ).length;

  const insights: Record<string, string> = {
    "chief-of-staff":
      ctx.counts.urgent > 0
        ? `Du har ${ctx.counts.today} opgave${ctx.counts.today === 1 ? "" : "r"} i dag – heraf ${ctx.counts.urgent} der haster.`
        : `Du har ${ctx.counts.today} opgave${ctx.counts.today === 1 ? "" : "r"} i dag. Ingen brandslukning – fint udgangspunkt.`,
    sales:
      followUps > 0
        ? `${followUps} kundeopfølgning${followUps === 1 ? "" : "er"} venter.`
        : `Ingen åbne kundeopfølgninger lige nu.`,
    marketing:
      marketing > 0
        ? `${marketing} markedsføringsopgave${marketing === 1 ? "" : "r"} klar til at blive lavet.`
        : `Idé: lav en kort video af en bil fra lageret til sociale medier.`,
    home:
      priv.length > 0
        ? `${priv.length} privat opgave${priv.length === 1 ? "" : "r"} på listen.`
        : `Hjemmefronten er rolig – ingen private opgaver i kø.`,
    memory:
      ctx.notesCount > 0
        ? `${ctx.notesCount} note${ctx.notesCount === 1 ? "" : "r"} gemt og søgbare.`
        : `Ingen noter endnu – gem din første idé i dit second brain.`,
    mail:
      ctx.emails.length > 0
        ? `${ctx.counts.unreadMail} ulæst${ctx.counts.unreadMail === 1 ? "" : "e"} af ${ctx.emails.length} mail${ctx.emails.length === 1 ? "" : "s"}.`
        : "Slå Gmail til i Indstillinger, så henter jeg dine mails ind.",
    calendar:
      ctx.calendarEvents.length > 0
        ? `${ctx.counts.upcomingEvents} kommende begivenhed${ctx.counts.upcomingEvents === 1 ? "" : "er"} i kalenderen.`
        : "Slå Google Kalender til i Indstillinger for at samle dine aftaler.",
    research: "Kobles på i en senere fase.",
    finance: "Kobles på i en senere fase.",
    health: "Kobles på i en senere fase.",
    education: "Kobles på i en senere fase.",
  };

  return agents.map((a) => ({ agentId: a.id, text: insights[a.id] ?? "" }));
}

/**
 * Dags-brief ud fra klokkeslættet (morgen / arbejdstjek / aften).
 */
export function currentBrief(
  ctx: AssistantContext,
  date: Date = new Date(),
): { greeting: string; title: string; lines: string[] } {
  const hour = date.getHours();
  const work = ctx.tasks.filter((t) => t.workspace === "work");
  const followUps = work.filter((t) => t.category === "kundeopfoelgning").length;

  if (hour < 11) {
    return {
      greeting: "Godmorgen Lasse ☀️",
      title: "Dagens overblik",
      lines: [
        `Du har ${ctx.counts.today} opgave${ctx.counts.today === 1 ? "" : "r"} i dag.`,
        ctx.counts.urgent > 0
          ? `${ctx.counts.urgent} af dem haster – tag dem først.`
          : "Ingen hasteopgaver – god start på dagen.",
        `${ctx.counts.work} arbejdsopgaver · ${ctx.counts.private} private.`,
      ],
    };
  }

  if (hour < 17) {
    return {
      greeting: "Arbejdstjek 🚗",
      title: "Storgaard Biler",
      lines: [
        followUps > 0
          ? `${followUps} kundeopfølgning${followUps === 1 ? "" : "er"} bør følges op i dag.`
          : "Ingen åbne kundeopfølgninger lige nu.",
        `${work.length} aktive arbejdsopgaver i alt.`,
        "Husk markedsføring: et opslag eller en kort video rykker.",
      ],
    };
  }

  return {
    greeting: "Godaften Lasse 🌙",
    title: "Aften & i morgen",
    lines: [
      `Du har fået ${ctx.counts.completedToday} opgave${ctx.counts.completedToday === 1 ? "" : "r"} fra hånden i dag.`,
      `${ctx.counts.private} private opgaver venter – familie og hjem.`,
      ctx.counts.today > 0
        ? `${ctx.counts.today} opgave${ctx.counts.today === 1 ? "" : "r"} står stadig til i dag/i morgen.`
        : "Listen for i dag er tom – godt gået.",
    ],
  };
}
