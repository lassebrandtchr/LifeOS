-- =====================================================================
-- LifeOS – Migration 0002: Kernetabeller + Row Level Security
-- ---------------------------------------------------------------------
-- Opretter de tabeller, LifeOS skal bruge, og slår RLS til på dem alle,
-- så hver bruger KUN kan se sine egne data (auth.uid() = user_id).
--
-- Tabellerne er bevidst minimale i denne fase – de udbygges, når de
-- enkelte moduler bygges. Det vigtige nu er, at sikkerheden er på plads.
-- =====================================================================

-- "Verden" data hører til (matcher LifeOS' tre arbejdsområder).
do $$ begin
  create type public.workspace as enum ('shared', 'private', 'work');
exception
  when duplicate_object then null;
end $$;

-- --------------------------------------------------------------------
-- Tabeller
-- --------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace public.workspace not null default 'shared',
  title text not null,
  description text,
  status text not null default 'open',
  priority text not null default 'normal',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace public.workspace not null default 'shared',
  name text not null,
  status text not null default 'active',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace public.workspace not null default 'shared',
  title text,
  body text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace public.workspace not null default 'shared',
  content text not null,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace public.workspace not null default 'shared',
  subject text,
  snippet text,
  from_addr text,
  is_read boolean not null default false,
  external_id text,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace public.workspace not null default 'shared',
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  status text not null default 'ny',
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'lager',
  make text,
  model text,
  year int,
  price numeric,
  status text not null default 'paa_lager',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'idea',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  agent text not null,
  status text not null default 'pending',
  input jsonb,
  output jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------------
-- Slå RLS til + standardpolitik på alle tabeller i én løkke.
-- Politik: brugeren må kun røre rækker, hvor auth.uid() = user_id.
-- updated_at holdes opdateret via trigger (funktionen fra 0001).
-- --------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'tasks', 'projects', 'notes', 'memories', 'emails',
    'calendar_events', 'customers', 'vehicles', 'marketing_ideas',
    'notifications', 'agent_runs'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format($f$
      drop policy if exists "Egne data – fuld adgang" on public.%I;
      create policy "Egne data – fuld adgang"
        on public.%I for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t, t);

    execute format($f$
      drop trigger if exists trg_%I_updated_at on public.%I;
      create trigger trg_%I_updated_at
        before update on public.%I
        for each row execute function public.set_updated_at();
    $f$, t, t, t, t);
  end loop;
end $$;
