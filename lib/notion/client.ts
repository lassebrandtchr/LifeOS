import "server-only";

/**
 * Notion API – tynd wrapper (kun det LifeOS bruger). Bruger en intern
 * integration-token (Bearer). Ingen eksterne pakker, bare fetch.
 */

const BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

/** Validerer en token og henter integrationens/arbejdsområdets navn. */
export async function verifyNotionToken(
  token: string,
): Promise<{ ok: boolean; name: string | null }> {
  try {
    const res = await fetch(`${BASE}/users/me`, { headers: headers(token) });
    if (!res.ok) return { ok: false, name: null };
    const data = await res.json();
    const name =
      (data?.bot?.workspace_name as string) ?? (data?.name as string) ?? null;
    return { ok: true, name };
  } catch {
    return { ok: false, name: null };
  }
}

export type NotionPage = {
  id: string;
  title: string;
  url: string | null;
  type: string;
  snippet: string | null;
  editedISO: string | null;
};

/** Trækker en læsbar titel ud af et Notion-objekt (side eller database). */
function extractTitle(obj: Record<string, unknown>): string {
  // Database: title ligger direkte.
  const dbTitle = obj.title as { plain_text?: string }[] | undefined;
  if (Array.isArray(dbTitle) && dbTitle.length) {
    return dbTitle.map((t) => t.plain_text ?? "").join("").trim() || "(uden titel)";
  }
  // Side: find den property der er af typen "title".
  const props = obj.properties as Record<string, { type?: string; title?: { plain_text?: string }[] }> | undefined;
  if (props) {
    for (const key of Object.keys(props)) {
      const p = props[key];
      if (p?.type === "title" && Array.isArray(p.title)) {
        const t = p.title.map((x) => x.plain_text ?? "").join("").trim();
        if (t) return t;
      }
    }
  }
  return "(uden titel)";
}

/** Søger i de sider/databaser, integrationen har adgang til. */
export async function searchNotion(
  token: string,
  limit = 50,
): Promise<NotionPage[]> {
  try {
    const res = await fetch(`${BASE}/search`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        page_size: limit,
        sort: { direction: "descending", timestamp: "last_edited_time" },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.results ?? []) as Record<string, unknown>[];
    return results.map((r) => ({
      id: r.id as string,
      title: extractTitle(r),
      url: (r.url as string) ?? null,
      type: (r.object as string) ?? "page",
      snippet: null,
      editedISO: (r.last_edited_time as string) ?? null,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────── Databaser & rækker ──────────────────────────
// Brugt af "Notion → Opgaver"-synken: find brugerens databaser og hent deres
// rækker. Vi bruger den klassiske /databases/{id}/query (Notion-Version
// 2022-06-28), så ingen ekstra opsætning kræves.

export type NotionDatabase = { id: string; title: string };

/** Lister de databaser, integrationen har adgang til (delt med den). */
export async function listNotionDatabases(
  token: string,
): Promise<NotionDatabase[]> {
  try {
    const res = await fetch(`${BASE}/search`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({
        page_size: 100,
        filter: { value: "database", property: "object" },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.results ?? []) as Record<string, unknown>[];
    return results.map((r) => ({
      id: r.id as string,
      title: extractTitle(r),
    }));
  } catch {
    return [];
  }
}

/** En rå Notion-række (side i en database), kun det vi skal bruge. */
export type NotionRow = {
  id: string;
  properties: Record<string, unknown>;
};

/**
 * Henter ALLE rækker fra en database (følger paginering automatisk).
 * Returnerer den rå "properties" pr. række – mapping sker et andet sted.
 */
export async function queryNotionDatabase(
  token: string,
  databaseId: string,
): Promise<NotionRow[]> {
  const rows: NotionRow[] = [];
  let cursor: string | undefined;
  // Sikkerhedsloft: max 10 sider à 100 = 1000 rækker.
  for (let page = 0; page < 10; page++) {
    try {
      const res = await fetch(`${BASE}/databases/${databaseId}/query`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      });
      if (!res.ok) break;
      const data = await res.json();
      const results = (data.results ?? []) as Record<string, unknown>[];
      for (const r of results) {
        rows.push({
          id: r.id as string,
          properties: (r.properties as Record<string, unknown>) ?? {},
        });
      }
      if (!data.has_more) break;
      cursor = data.next_cursor as string;
      if (!cursor) break;
    } catch {
      break;
    }
  }
  return rows;
}
