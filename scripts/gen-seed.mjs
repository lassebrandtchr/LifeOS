// =====================================================================
// LifeOS – generator til "rigtig data"-seed (Fase 9, fuld connector-sync)
// ---------------------------------------------------------------------
// Tager de RIGTIGE data, assistenten hentede via connector-værktøjerne
// (Gmail, Google Kalender, Notion), og skriver et SQL-script som Lasse kan
// køre i Supabase. Scriptet kobler data til hans bruger via e-mailen (ingen
// nøgler nødvendige) og er idempotent (kan køres flere gange uden dubletter).
//
// FULD sync: hele indbakken (9 tråde) + hele kalenderen (alle arbejdsdage
// 24. jun–29. sep + Jackie's fødselsdag) + 15 Notion-sider.
//
// Kategorisering er REGELBASERET og holdes i sync med
// features/integrations/categorize.ts (samme regler).
//
// Kør:  node scripts/gen-seed.mjs
// Output: supabase/seed/real-data.sql
// =====================================================================

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OWNER_EMAIL = "lassebrandtchr@gmail.com";
const __dirname = dirname(fileURLToPath(import.meta.url));

// --- små hjælpere -----------------------------------------------------
const decode = (s) =>
  String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const clip = (s, n = 240) => {
  const t = decode(s);
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
};

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v ? "true" : "false");

// --- Kategorisering (HOLD I SYNC med features/integrations/categorize.ts) ---
const CLIENT_DOMAINS = ["emcare.dk"];
function categorize(from, subject, snippet) {
  const f = (from ?? "").toLowerCase();
  const domain = f.split("@")[1] ?? "";
  const text = `${subject ?? ""} ${snippet ?? ""}`.toLowerCase();
  if (CLIENT_DOMAINS.some((d) => domain.includes(d))) return "kunde";
  if (/regning|faktura|invoice|opkræv|betaling|mobilepay/.test(text)) return "faktura";
  if (/leveret|delivered|afsendt|shipment|forsendelse|tracking|yunexpress/.test(text)) return "levering";
  if (/ordrebekræft|kvittering|receipt|booking|billet|ticket|din ordre|your order|ordre|order/.test(text)) return "kvittering";
  if (/nyhedsbrev|newsletter|unsubscribe|afmeld|level up your content/.test(text) || /kajabimail|insideapple|apple\.com|facebookmail|meta/.test(f)) return "nyhedsbrev";
  return null;
}

// --- DATA (hentet live via connectors) --------------------------------

// HELE indbakken: [external_id, subject, snippet, from, isRead, workspace, receivedAt]
const inbox = [
  ["19ef68ac95b500fc", "Ordrebekræftelsen Løbeshop.dk", "Tak for din ordre. Ordrenummer #262008597. Vi pakker og sender din ordre hurtigst muligt.", "info@loebeshop.dk", false, "private", "2026-06-23T22:12:30Z"],
  ["19eee9b1b73f0b32", "Din regning fra 3 – Juni 2026", "Din regning for denne måned er på 465,17 kr. Beløbet trækkes den 30. juni via MobilePay.", "3danmark@3mail.3.dk", true, "private", "2026-06-22T09:13:19Z"],
  ["19eda137abfef29f", "SV: Online Fysioterapi/Coaching", "Hej Mike og Hej Lasse. Du kan indsætte følgende script på sitet (landingsside med jeres logo som aftalt).", "dj@emcare.dk", true, "work", "2026-06-18T09:32:41Z"],
  ["19eb174acb876bcc", "5 videos to level up your content", "Get the foundations right and the rest will follow.", "adrian-per@e.kajabimail.net", true, "private", "2026-06-10T12:14:33Z"],
  ["19e825fa2bd69200", "Your Tickets", "Hej Lasse Sylvester. Thank you for your booking. Click Show order/Download all tickets below to access your tickets.", "info@eventbilletten.dk", true, "private", "2026-06-01T08:49:25Z"],
  ["19e725b98cc91243", "Your order Retropia Repurposed Disposable Film Camera Lens has been delivered.", "RETROPIA: Your order just landed! Your parcel has been delivered successfully.", "support@retro-pia.com", true, "private", "2026-05-29T06:11:04Z"],
  ["19e725b967b5a932", "A shipment from order #121152 has been delivered", "The last items in your order have been delivered. YunExpress tracking number: YT2613900703956587.", "support@retro-pia.com", true, "private", "2026-05-29T06:11:05Z"],
  ["19e3c16c51fa2b74", "Få Apple TV+ gratis i 3 måneder", "Du får Apple TV+ gratis i 3 måneder med din nye Apple-enhed. Dine 3 gratis måneder begynder nu.", "appletv@insideapple.apple.com", true, "private", "2026-05-18T17:16:21Z"],
  ["19dfa0038ac30549", "Inkluder automatisk flere side- og produktoplysninger via din Meta-pixel", "Kommende forbedringer af Meta-pixel, der skal gøre din oplevelse med annoncering på Meta-platforme bedre.", "notification@facebookmail.com", true, "work", "2026-05-05T21:16:49Z"],
];
const emails = inbox.map(([ext, subject, snippet, from, isRead, ws, recv]) => [
  "gmail",
  ext,
  subject,
  snippet,
  from,
  isRead,
  categorize(from, subject, snippet),
  ws,
  recv,
]);

// HELE kalenderen: alle arbejdsdage (24. jun–29. sep) + særlige aftaler.
const WORK_DATES = "2026-06-24,2026-06-25,2026-06-26,2026-06-29,2026-06-30,2026-07-01,2026-07-02,2026-07-03,2026-07-06,2026-07-07,2026-07-08,2026-07-09,2026-07-10,2026-07-13,2026-07-14,2026-07-15,2026-07-16,2026-07-17,2026-07-20,2026-07-21,2026-07-22,2026-07-23,2026-07-24,2026-07-27,2026-07-28,2026-07-29,2026-07-30,2026-07-31,2026-08-03,2026-08-04,2026-08-05,2026-08-06,2026-08-07,2026-08-10,2026-08-11,2026-08-12,2026-08-13,2026-08-14,2026-08-17,2026-08-18,2026-08-19,2026-08-20,2026-08-21,2026-08-24,2026-08-25,2026-08-26,2026-08-27,2026-08-28,2026-08-31,2026-09-01,2026-09-02,2026-09-03,2026-09-04,2026-09-07,2026-09-08,2026-09-09,2026-09-10,2026-09-11,2026-09-14,2026-09-15,2026-09-16,2026-09-17,2026-09-18,2026-09-21,2026-09-22,2026-09-23,2026-09-24,2026-09-25,2026-09-28,2026-09-29".split(",");

const mkWork = (date) => [
  "google_calendar",
  `a9d72667eb8849088190e72a236ce813_${date.replace(/-/g, "")}T064500Z`,
  "Arbejde - Storgaard Biler",
  null,
  null,
  `${date}T08:45:00+02:00`,
  `${date}T17:00:00+02:00`,
  false,
  "work",
];

const events = [
  ...WORK_DATES.map(mkWork),
  [
    "google_calendar",
    "clh32d34cgs3cbb475h3cb9k60o6abb275j36b9p75i36p9j6krj0o9ock_20260922T075500Z",
    "Jackie's fødselsdag",
    null,
    "Hermelintoften 19, 6760 Ribe, Danmark",
    "2026-09-22T09:55:00+02:00",
    "2026-09-22T21:55:00+02:00",
    false,
    "private",
  ],
];

// Notion: 15 sider (titel + uddrag + redigeret-dato er ægte).
const notion = [
  ["aa52ee19-99fd-4836-9d55-ae878d562ca6", "Storgaard Biler A/S", "page", "https://app.notion.com/p/aa52ee1999fd48369d55ae878d562ca6", "Forsiden for Storgaard Biler A/S.", "2026-06-23T13:53:00Z", "work"],
  ["1795a66f-b119-478e-a8cb-3dc6706fdd97", "Vigtige processer i salg (import, huskeliste etc)", "page", "https://app.notion.com/p/1795a66fb119478ea8cb3dc6706fdd97", "Leasingkontrakt til Storgaard Biler (Subleasing).", "2026-05-27T11:16:00Z", "work"],
  ["383c8f6e-bf2c-80ee-b8ed-d723287c015e", "Yo", "page", "https://app.notion.com/p/383c8f6ebf2c80eeb8edd723287c015e", "I tirsdags var det Magnus' tur til at fejre, at han har været hos Storgaard Biler i hele 20 år.", "2026-06-18T13:17:00Z", "work"],
  ["96e31464-c535-4d7d-9099-e03df8cff5bf", "Facebook, Instagram, Tik-Tok og YouTube", "page", "https://app.notion.com/p/96e31464c5354d7d9099e03df8cff5bf", "Slå katten af tønden hos Storgaard Biler – idéer til sociale medier.", "2026-05-27T13:26:00Z", "work"],
  ["d5ab7719-94e1-4431-b6d0-c394274d4ea1", "Ideer til arbejdsfordelingen - Salg 2023", "page", "https://app.notion.com/p/d5ab771994e14431b6d0c394274d4ea1", "Få mere tid til at være kreativ med idéer til at øge kendskabet til Storgaard Biler og Storgaard Leasing.", "2026-01-08T13:54:00Z", "work"],
  ["361c8f6e-bf2c-802d-94d4-c4bd39918144", "Møde med Trustpilot vedr. Plus Plan maj 2026", "page", "https://app.notion.com/p/361c8f6ebf2c802d94d4c4bd39918144", "Lasse bekræftede høj digital betydning, svag nuværende review-opsamling og interesse i et automatiseret setup.", "2026-05-15T06:35:00Z", "work"],
  ["33cc8f6e-bf2c-80c1-b0ce-d4b1fd39da77", "Ting til morgenmødet", "page", "https://app.notion.com/p/33cc8f6ebf2c80c1b0ced4b1fd39da77", "Punkter til morgenmødet.", "2026-06-22T08:55:00Z", "work"],
  ["374c8f6e-bf2c-80f7-9c1e-e5d469bfc359", "Ret disse biler inde på bilinfo vedr. løbetid på leasingpris!", "page", "https://app.notion.com/p/374c8f6ebf2c80f79c1ee5d469bfc359", "Liste over biler der skal rettes på bilinfo vedr. løbetid på leasingpris.", "2026-06-08T10:02:00Z", "work"],
  ["207c8f6e-bf2c-8031-ac93-de249149ba6e", "Biler der skal klargøres etc.", "page", "https://app.notion.com/p/207c8f6ebf2c8031ac93de249149ba6e", "Biler der skal klargøres.", "2026-01-08T13:54:00Z", "work"],
  ["357c8f6e-bf2c-8028-a2a0-ff4c6772e321", "CarBoost statusmøde maj 2026", "page", "https://app.notion.com/p/357c8f6ebf2c8028a2a0ff4c6772e321", "Med Christoffer fra Carboost. Salget går godt, men udbuddet af biler er den aktuelle flaskehals.", "2026-05-05T08:48:00Z", "work"],
  ["2cbc8f6e-bf2c-8071-a335-cb1bd40e0fac", "Tekst med FED skrift (og andet)", "page", "https://app.notion.com/p/2cbc8f6ebf2c8071a335cb1bd40e0fac", "Tekst med fed skrift og andre formateringstricks.", "2026-03-11T10:26:00Z", "work"],
  ["247c8f6e-bf2c-8043-ae6e-d9bd6b42571e", "Importbil – Tesla Model 3 SR/Long Range fra 2021 (budget max 205.000 kr)", "page", "https://app.notion.com/p/247c8f6ebf2c8043ae6ed9bd6b42571e", "Tesla Model 3 Standard Range RWD, fra 2021 og frem, sort/hvid/grå, 50-70.000 km.", "2026-01-08T13:54:00Z", "work"],
  ["35dc8f6e-bf2c-806d-b88a-f3d02d8e5b00", "Ideer til automationer der skal bygges via Codex", "page", "https://app.notion.com/p/35dc8f6ebf2c806db88af3d02d8e5b00", "Automationer: tjek at salgsbiler på bilinfo og Au2office har arbejdskort (teknisk + kosmetisk).", "2026-05-11T09:08:00Z", "work"],
  ["1c0c8f6e-bf2c-80ca-88fc-ce843c59dace", "Design - Flyers til biler ved værkstedsbesøg", "page", "https://app.notion.com/p/1c0c8f6ebf2c80ca88fcce843c59dace", "Flyers til biler ved værkstedsbesøg.", "2026-01-08T13:54:00Z", "work"],
  ["328c8f6e-bf2c-807e-90ed-cf781c9a79fa", "Videoidé: Kling Motion Control om vores kunder", "page", "https://app.notion.com/p/328c8f6ebf2c807e90edcf781c9a79fa", "Video om hvad kunderne synes om at handle hos Storgaard Biler.", "2026-04-09T10:06:00Z", "work"],
];

// --- byg SQL ----------------------------------------------------------
const U = `(select id from auth.users where email = ${q(OWNER_EMAIL)})`;

const emailRows = emails
  .map(
    ([source, ext, subject, snippet, from, isRead, cat, ws, recv]) =>
      `  (${q(source)}, ${q(ext)}, ${q(clip(subject, 200))}, ${q(clip(snippet))}, ${q(from)}, ${b(isRead)}, ${q(cat)}, ${q(ws)}, ${q(recv)})`,
  )
  .join(",\n");

const eventRows = events
  .map(
    ([source, ext, title, desc, loc, starts, ends, allDay, ws]) =>
      `  (${q(source)}, ${q(ext)}, ${q(clip(title, 200))}, ${q(desc === null ? null : clip(desc))}, ${q(loc)}, ${q(starts)}, ${q(ends)}, ${b(allDay)}, ${q(ws)})`,
  )
  .join(",\n");

const notionRows = notion
  .map(
    ([ext, title, type, url, snippet, edited, ws]) =>
      `  (${q(ext)}, ${q(clip(title, 200))}, ${q(type)}, ${q(url)}, ${q(clip(snippet))}, ${q(edited)}, ${q(ws)})`,
  )
  .join(",\n");

const sql = `-- =====================================================================
-- LifeOS – FULD sync af dine connectors (Gmail, Google Kalender, Notion)
-- Genereret af scripts/gen-seed.mjs den ${new Date().toISOString().slice(0, 10)}.
-- ---------------------------------------------------------------------
-- ${emails.length} mails (hele indbakken) · ${events.length} kalender-aftaler · ${notion.length} Notion-sider.
-- Kør HELE dette script i Supabase → SQL Editor (kræver migration 0004).
-- Det kobler data til din bruger (${OWNER_EMAIL}) og kan køres flere
-- gange uden at lave dubletter.
-- =====================================================================

-- 1) Mails ------------------------------------------------------------
insert into public.emails
  (user_id, source, external_id, subject, snippet, from_addr, is_read, category, workspace, received_at)
select ${U}, d.source, d.external_id, d.subject, d.snippet, d.from_addr,
       d.is_read, d.category, d.workspace::public.workspace, d.received_at::timestamptz
from (values
${emailRows}
) as d(source, external_id, subject, snippet, from_addr, is_read, category, workspace, received_at)
on conflict (user_id, external_id) where external_id is not null
  do update set is_read = excluded.is_read, category = excluded.category;

-- 2) Kalender ---------------------------------------------------------
insert into public.calendar_events
  (user_id, source, external_id, title, description, location, starts_at, ends_at, all_day, workspace)
select ${U}, d.source, d.external_id, d.title, d.description::text, d.location::text,
       d.starts_at::timestamptz, d.ends_at::timestamptz, d.all_day, d.workspace::public.workspace
from (values
${eventRows}
) as d(source, external_id, title, description, location, starts_at, ends_at, all_day, workspace)
on conflict (user_id, external_id) where external_id is not null do nothing;

-- 3) Notion -----------------------------------------------------------
insert into public.notion_items
  (user_id, external_id, title, type, url, snippet, edited_at, workspace)
select ${U}, d.external_id, d.title, d.type, d.url, d.snippet,
       d.edited_at::timestamptz, d.workspace::public.workspace
from (values
${notionRows}
) as d(external_id, title, type, url, snippet, edited_at, workspace)
on conflict (user_id, external_id) where external_id is not null do nothing;

-- 4) Markér connectorne som forbundne i Integration Center ------------
insert into public.integrations (user_id, connector_id, enabled, status, last_synced_at)
select ${U}, d.connector_id, true, 'connected', now()
from (values ('gmail'), ('google_calendar'), ('notion')) as d(connector_id)
on conflict (user_id, connector_id)
  do update set enabled = excluded.enabled,
                status = excluded.status,
                last_synced_at = excluded.last_synced_at;
`;

const outPath = resolve(__dirname, "../supabase/seed/real-data.sql");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, sql, "utf8");
console.log(`Skrev ${emails.length} mails, ${events.length} events, ${notion.length} notion-sider →`);
console.log(outPath);
