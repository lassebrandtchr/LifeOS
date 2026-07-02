import type { Priority, Workspace } from "@/features/tasks/constants";
import type { Task } from "@/features/tasks/types";
import type { MailMessage } from "@/features/integrations/types";
import { stripHtmlInline } from "@/lib/text/strip-html";

/**
 * Action-liste – bygger et prioriteret, kombineret overblik (Haster/Vigtigt/
 * Kan vente) af aktive opgaver og indbakke-mail for én verden (work/private).
 *
 * Ren funktion, ingen I/O: kaldes server-side (page.tsx) med data der allerede
 * er hentet (getTasksByBucket + getMailMessages), og bygger listen på ny hver
 * gang – "altid opdateret" kommer af at kilderne selv altid er live, ikke af
 * caching her.
 */

export type MailThread = {
  id: string;
  normalizedSubject: string;
  subject: string;
  snippet: string;
  from: string;
  receivedAt: string | null;
  mailIds: string[];
};

export type ActionSourceLabel =
  | "Fra opgavesystemet"
  | "Fra mail"
  | "Fra mail + opgave";

export type ActionItem = {
  id: string;
  priority: Priority;
  title: string;
  context: string;
  sourceLabel: ActionSourceLabel;
  task?: Task;
  mailThread?: MailThread;
  contact?: { phone?: string; email?: string };
};

export type ActionListGroups = {
  urgent: ActionItem[];
  important: ActionItem[];
  can_wait: ActionItem[];
};

// ─────────────────────────── Tråd-gruppering ─────────────────────────────

const THREAD_PREFIX_RE = /^(SV|VS|RE|FW|AW)\s*:\s*/i;

export function normalizeSubject(subject: string): string {
  let s = subject.trim();
  let prev: string;
  do {
    prev = s;
    s = s.replace(THREAD_PREFIX_RE, "").trim();
  } while (s !== prev);
  return s.toLowerCase();
}

export function groupMailsIntoThreads(mails: MailMessage[]): MailThread[] {
  const groups = new Map<string, MailMessage[]>();
  for (const mail of mails) {
    const normalized = normalizeSubject(mail.subject || "");
    const key = normalized ? `subj:${normalized}` : `id:${mail.id}`;
    const list = groups.get(key) ?? [];
    list.push(mail);
    groups.set(key, list);
  }

  const threads: MailThread[] = [];
  for (const [key, group] of groups) {
    const sorted = [...group].sort(
      (a, b) => (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""),
    );
    const newest = sorted[0];
    threads.push({
      id: newest.id,
      normalizedSubject: key,
      subject: newest.subject,
      snippet: newest.snippet,
      from: newest.from,
      receivedAt: newest.receivedAt,
      mailIds: sorted.map((m) => m.id),
    });
  }
  return threads.sort((a, b) => (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""));
}

// ─────────────────────────── Signal-udtræk ───────────────────────────────

const PHONE_RE = /(?:\+45|0045)?\s?(\d{2}[\s]?\d{2}[\s]?\d{2}[\s]?\d{2})\b/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PLATE_RE = /\b([A-ZÆØÅ]{2})\s?(\d{2,5})\b/gi;

const STOPWORDS = new Set([
  "og", "til", "fra", "med", "for", "den", "det", "der", "som", "en", "et",
  "på", "om", "af", "har", "er", "sv", "vs", "re", "fw", "aw", "hej", "kunde",
  "kunden", "bil", "biler", "tak", "venlig", "hilsen", "mvh",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFKD")
      .split(/[^a-zæøå0-9]+/i)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

type Signals = {
  phones: string[];
  emails: string[];
  plates: string[];
  tokens: Set<string>;
};

function extractSignals(text: string, fromAddr?: string): Signals {
  const phones = [...text.matchAll(PHONE_RE)].map((m) => m[1].replace(/\s/g, ""));
  const emails = [...text.matchAll(EMAIL_RE)].map((m) => m[0].toLowerCase());
  if (fromAddr) emails.push(fromAddr.toLowerCase());
  const plates = [...text.matchAll(PLATE_RE)].map((m) => `${m[1]}${m[2]}`.toUpperCase());
  return { phones, emails, plates, tokens: tokenize(text) };
}

function taskSignals(task: Task): Signals {
  return extractSignals(
    [task.title, task.description ?? "", stripHtmlInline(task.notes)].join(" "),
  );
}

function threadSignals(thread: MailThread): Signals {
  return extractSignals(`${thread.subject} ${thread.snippet}`, thread.from);
}

function extractContact(signals: Signals): { phone?: string; email?: string } {
  return { phone: signals.phones[0], email: signals.emails[0] };
}

// ────────────────────────── Afsender/nøgleords-regler ────────────────────

type SenderRule = {
  id: string;
  senderMatch: RegExp;
  subjectOrBodyMatch?: RegExp;
  /** "" = behold trådens/opgavens egen titel, kun prioritet påvirkes. */
  title: string;
  priority: Priority;
  appliesTo: "work" | "private" | "both";
};

export const senderRules: SenderRule[] = [
  {
    id: "autoproff-t4g-valuation",
    senderMatch: /autoproff|t4g/i,
    title: "Husk at kontakte kunden med et bud på bilen",
    priority: "urgent",
    appliesTo: "work",
  },
  {
    id: "urgent-keywords",
    senderMatch: /.*/,
    subjectOrBodyMatch: /\b(haster|akut|i dag|deadline|straks)\b/i,
    title: "",
    priority: "urgent",
    appliesTo: "both",
  },
];

function findFiringRule(thread: MailThread, workspace: Workspace): SenderRule | null {
  const scope = workspace === "work" ? "work" : "private";
  for (const rule of senderRules) {
    if (rule.appliesTo !== "both" && rule.appliesTo !== scope) continue;
    if (!rule.senderMatch.test(thread.from)) continue;
    if (
      rule.subjectOrBodyMatch &&
      !rule.subjectOrBodyMatch.test(`${thread.subject} ${thread.snippet}`)
    ) {
      continue;
    }
    return rule;
  }
  return null;
}

// ────────────────────────────── Matching ─────────────────────────────────

function matchTaskToThread(
  task: Task,
  threads: MailThread[],
): MailThread | null {
  const sig = taskSignals(task);
  for (const thread of threads) {
    const mailSig = threadSignals(thread);
    if (sig.phones.some((p) => mailSig.phones.includes(p))) return thread;
    if (sig.emails.some((e) => mailSig.emails.includes(e))) return thread;
    if (sig.plates.some((p) => mailSig.plates.includes(p))) return thread;
    if ([...sig.tokens].some((t) => mailSig.tokens.has(t))) return thread;
  }
  return null;
}

// ────────────────────────────── Hovedfunktion ─────────────────────────────

export function buildActionList(
  tasks: Task[],
  mails: MailMessage[],
  workspace: Workspace,
): ActionListGroups {
  const threads = groupMailsIntoThreads(mails);
  const claimedThreadIds = new Set<string>();
  const items: ActionItem[] = [];

  for (const task of tasks) {
    const available = threads.filter((t) => !claimedThreadIds.has(t.id));
    const match = matchTaskToThread(task, available);
    if (match) claimedThreadIds.add(match.id);

    const rule = match ? findFiringRule(match, workspace) : null;
    const title = rule && rule.title ? rule.title : task.title;
    const contact = match ? extractContact(threadSignals(match)) : extractContact(taskSignals(task));

    items.push({
      id: match ? `task:${task.id}+mail:${match.id}` : `task:${task.id}`,
      priority: task.priority,
      title,
      context: match ? match.snippet : (task.description || stripHtmlInline(task.notes)).slice(0, 140),
      sourceLabel: match ? "Fra mail + opgave" : "Fra opgavesystemet",
      task,
      mailThread: match ?? undefined,
      contact,
    });
  }

  for (const thread of threads) {
    if (claimedThreadIds.has(thread.id)) continue;
    const rule = findFiringRule(thread, workspace);
    const priority = rule ? rule.priority : "important";
    const title = rule && rule.title ? rule.title : thread.subject;

    items.push({
      id: `mail:${thread.id}`,
      priority,
      title,
      context: thread.snippet,
      sourceLabel: "Fra mail",
      mailThread: thread,
      contact: extractContact(threadSignals(thread)),
    });
  }

  return {
    urgent: items.filter((i) => i.priority === "urgent"),
    important: items.filter((i) => i.priority === "important"),
    can_wait: items.filter((i) => i.priority === "can_wait"),
  };
}
