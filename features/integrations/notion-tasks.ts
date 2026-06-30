import type { NotionRow } from "@/lib/notion/client";
import type { Bucket, Status, Workspace } from "@/features/tasks/constants";

/**
 * Oversætter Notion-databaserækker til LifeOS-opgaver.
 *
 * Bevidst GENERISK: i stedet for at kende hver databases præcise feltnavne,
 * kigger vi efter felternes TYPE (title / date / checkbox / status / select)
 * og gætter klogt ud fra navnet. Så virker det både for "To-do-kalender"
 * (Storgaard) og "Personligt Dashboard" (Privat), uden at vi på forhånd
 * kender det sidste skema.
 */

export type MappedNotionTask = {
  notionId: string;
  title: string;
  deadline: string | null; // ISO eller null
  status: Status;
  done: boolean;
  category: string | null;
  workArea: string | null; // det rå "arbejdsområde"-navn (gemmes som tag)
};

// ── Små hjælpere til at læse Notion-properties ──
type Prop = { type?: string } & Record<string, unknown>;

function plain(richText: unknown): string {
  if (!Array.isArray(richText)) return "";
  return richText
    .map((t) => (t as { plain_text?: string })?.plain_text ?? "")
    .join("")
    .trim();
}

/** Find første property af en bestemt type – evt. med navne-præference. */
function findProp(
  props: Record<string, Prop>,
  type: string,
  prefer?: RegExp,
): { name: string; prop: Prop } | null {
  const matches = Object.entries(props).filter(([, p]) => p?.type === type);
  if (matches.length === 0) return null;
  if (prefer) {
    const hit = matches.find(([name]) => prefer.test(name.toLowerCase()));
    if (hit) return { name: hit[0], prop: hit[1] };
  }
  return { name: matches[0][0], prop: matches[0][1] };
}

/** Notion-statusnavn → LifeOS-status (dansk + engelsk, løst match). */
function mapStatusName(name: string | null, done: boolean): Status {
  if (done) return "done";
  const n = (name ?? "").toLowerCase();
  if (!n) return "not_started";
  if (/(færdig|faerdig|done|udført|udfoert|complete|afsluttet)/.test(n)) return "done";
  if (/(gang|progress|igang|i gang|started|påbegyndt|paabegyndt)/.test(n)) return "in_progress";
  if (/(afvent|venter|wait|pause|hold|blokeret)/.test(n)) return "waiting";
  if (/(arkiv|archive)/.test(n)) return "archived";
  return "not_started";
}

/**
 * Notion "Arbejdsområde" → LifeOS-kategori-id (kun arbejde har en taksonomi).
 * Ukendte områder → null (men det rå navn bevares som tag for sporbarhed).
 */
function mapWorkAreaToCategory(workArea: string | null): string | null {
  const a = (workArea ?? "").toLowerCase();
  if (!a) return null;
  if (/markedsf/.test(a)) return "markedsfoering";
  if (/sociale|social/.test(a)) return "sociale_medier";
  if (/salg/.test(a)) return "salg";
  if (/finansier/.test(a)) return "finansiering";
  if (/værksted|vaerksted|workshop|klargøring|klargoring/.test(a)) return "administration";
  if (/kunde/.test(a)) return "kundeopfoelgning";
  return null;
}

/** Mapper én Notion-række til en LifeOS-opgave (eller null hvis uden titel). */
export function mapRowToTask(row: NotionRow): MappedNotionTask | null {
  const props = row.properties as Record<string, Prop>;

  // Titel (krævet)
  const titleProp = findProp(props, "title");
  const title = titleProp ? plain(titleProp.prop.title) : "";
  if (!title) return null;

  // Dato/deadline
  const dateProp = findProp(props, "date", /dato|deadline|frist|date|forfald/);
  const dateVal = dateProp?.prop.date as { start?: string } | null | undefined;
  const deadline = dateVal?.start ? new Date(dateVal.start).toISOString() : null;

  // "Opgave færdig"-checkbox
  const checkProp = findProp(props, "checkbox", /færdig|faerdig|done|udført|udfoert|complete/);
  const done = Boolean(checkProp?.prop.checkbox);

  // Status (Notion-type "status" eller en select kaldet "status?")
  let statusName: string | null = null;
  const statusTyped = findProp(props, "status");
  if (statusTyped) {
    statusName = (statusTyped.prop.status as { name?: string } | null)?.name ?? null;
  } else {
    const statusSelect = findProp(props, "select", /status/);
    if (statusSelect) {
      statusName = (statusSelect.prop.select as { name?: string } | null)?.name ?? null;
    }
  }
  const status = mapStatusName(statusName, done);

  // Arbejdsområde (select, ikke status-select)
  const areaProp = findProp(props, "select", /arbejdsområde|arbejdsomraade|område|omraade|kategori|type/);
  const workArea =
    (areaProp?.prop.select as { name?: string } | null)?.name ?? null;

  return {
    notionId: row.id,
    title,
    deadline,
    status,
    done,
    category: mapWorkAreaToCategory(workArea),
    workArea,
  };
}

/** Udleder hvilken kolonne (bucket) en opgave hører til ud fra deadline. */
export function deriveBucket(deadlineISO: string | null): Bucket {
  if (!deadlineISO) return "later";
  const deadline = new Date(deadlineISO);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (deadline.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return "today";
  if (diffDays <= 7) return "week";
  return "later";
}

/**
 * Afgør hvilken "verden" en database hører til ud fra dens titel.
 * Bevidst STRAM: vi importerer KUN fra de to databaser vi kender, så fremmede
 * databaser (fx en privat kalender) ikke ved et uheld havner under arbejde.
 *   • "To-do-kalender"      → arbejde (Storgaard)
 *   • "Personligt Dashboard" → privat
 */
export function workspaceForDatabase(dbTitle: string): Workspace | null {
  const t = dbTitle.trim().toLowerCase();
  // Privat tjekkes FØRST, så "Personligt Dashboard" aldrig fejltolkes.
  if (t.includes("personligt dashboard") || t.includes("personligt")) return "private";
  if (t.includes("to-do-kalender") || t.includes("to-do") || t.includes("storgaard")) return "work";
  return null;
}
