-- =====================================================================
-- LifeOS – Migration 0009: Marketing Workspace (Fase 10)
-- ---------------------------------------------------------------------
-- Marketingafdelingens egen arbejdsplads: kampagner, idébank, marketing-
-- kalender, wiki, medieoversigt og genbrugelige checklister. Marketing-
-- OPGAVER genbruger den eksisterende "tasks"-tabel (kategori = markedsføring
-- / sociale medier) – vi bygger ikke et parallelt opgavesystem. Her tilføjes
-- kun en kobling fra opgaver til kampagner (campaign_id).
--
-- Alt er REGELBASERET – ingen AI nødvendig. Idempotent + RLS som resten.
-- =====================================================================

-- ─────────────────────────────── Kampagner ──────────────────────────
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  start_date date,
  end_date date,
  status text not null default 'planned',          -- planned | active | paused | done
  platforms text[] not null default '{}',          -- facebook, instagram, tiktok, ...
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────── Idébank (udvid) ────────────────────────
-- marketing_ideas findes allerede (0002: title, body, status). Udvid den.
alter table public.marketing_ideas
  add column if not exists category text,
  add column if not exists kind text,              -- video | reel | tiktok | facebook | kampagne | branding
  add column if not exists tags text[] not null default '{}',
  add column if not exists favorite boolean not null default false;

-- ────────────────────────── Marketingkalender ───────────────────────
create table if not exists public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null default 'opslag',             -- fotoshoot | video | facebook | instagram | tiktok | nyhedsbrev | kampagne | tilbud | opslag
  event_date date not null,
  notes text,
  platform text,
  campaign_id uuid references public.marketing_campaigns (id) on delete set null,
  done boolean not null default false,
  -- Connector-klar: udfyldes når et opslag synkes fra fx Meta/TikTok senere.
  source text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────── Marketing-wiki ────────────────────────
create table if not exists public.marketing_wiki (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null default 'manualer',       -- brand | logoer | farver | fonte | arbejdsgange | skabeloner | checklister | manualer
  body text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── Medieoversigt ────────────────────────
create table if not exists public.marketing_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null default 'billede',            -- billede | video | logo | banner | dokument
  url text,                                        -- link/sti (filhosting kan kobles på senere)
  tags text[] not null default '{}',
  notes text,
  campaign_id uuid references public.marketing_campaigns (id) on delete set null,
  -- Connector-klar: udfyldes hvis filen senere hentes fra Drive/Dropbox o.l.
  source text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────── Checkliste-skabeloner ─────────────────────
create table if not exists public.marketing_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  items text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────── Checklister (instanser) ─────────────────────
create table if not exists public.marketing_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  template_id uuid references public.marketing_checklist_templates (id) on delete set null,
  campaign_id uuid references public.marketing_campaigns (id) on delete set null,
  items jsonb not null default '[]',               -- [{ "text": "...", "done": false }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────── Kobl marketingopgaver til kampagner ───────────────
alter table public.tasks
  add column if not exists campaign_id uuid references public.marketing_campaigns (id) on delete set null;

-- Hurtige opslag
create index if not exists marketing_campaigns_user_idx on public.marketing_campaigns (user_id, status);
create index if not exists marketing_events_user_idx on public.marketing_events (user_id, event_date);
create index if not exists marketing_media_user_idx on public.marketing_media (user_id, type);
create index if not exists tasks_campaign_idx on public.tasks (campaign_id) where campaign_id is not null;

-- ──────────── RLS + updated_at-triggere i én løkke (som 0003) ─────────
do $$
declare
  t text;
  all_tables text[] := array[
    'marketing_campaigns', 'marketing_events', 'marketing_wiki',
    'marketing_media', 'marketing_checklist_templates', 'marketing_checklists'
  ];
begin
  foreach t in array all_tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      drop policy if exists "Egne data – fuld adgang" on public.%I;
      create policy "Egne data – fuld adgang"
        on public.%I for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t, t, t);
    execute format($f$
      drop trigger if exists trg_%I_updated_at on public.%I;
      create trigger trg_%I_updated_at
        before update on public.%I
        for each row execute function public.set_updated_at();
    $f$, t, t, t, t);
  end loop;
end $$;
