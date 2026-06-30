-- =====================================================================
-- LifeOS – Migration 0003: Opgave- & projektsystem (Fase 6)
-- ---------------------------------------------------------------------
-- Udvider "tasks" og "projects" og opretter de tabeller, opgavesystemet
-- skal bruge (historik, tags, kommentarer, aktivitetslog, projektkategorier).
-- Alt er idempotent (kan køres flere gange) og beskyttet med RLS.
-- =====================================================================

-- ───────────────────────── Udvid "tasks" ────────────────────────────
alter table public.tasks
  add column if not exists category text,
  add column if not exists deadline timestamptz,
  add column if not exists reminder_at timestamptz,
  add column if not exists notes text,
  add column if not exists ai_notes text,
  add column if not exists project_id uuid references public.projects (id) on delete set null,
  add column if not exists bucket text not null default 'later',
  add column if not exists position double precision not null default extract(epoch from now()),
  add column if not exists tags text[] not null default '{}',
  add column if not exists completed_at timestamptz;

-- ──────────────────────── Udvid "projects" ──────────────────────────
alter table public.projects
  add column if not exists deadline timestamptz,
  add column if not exists notes text,
  add column if not exists category_id uuid,
  add column if not exists color text,
  add column if not exists completed_at timestamptz;

-- ─────────────────────────── Nye tabeller ───────────────────────────
create table if not exists public.project_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text,
  workspace public.workspace not null default 'shared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  title text,
  action text not null default 'completed',
  snapshot jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.task_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  type text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Hurtigere opslag
create index if not exists tasks_user_bucket_idx on public.tasks (user_id, bucket);
create index if not exists task_activity_user_idx on public.task_activity (user_id, created_at desc);
create index if not exists task_history_user_idx on public.task_history (user_id, created_at desc);

-- ──────────────── RLS + updated_at-triggere i én løkke ───────────────
do $$
declare
  t text;
  with_updated text[] := array['project_categories', 'task_comments'];
  all_tables text[] := array[
    'project_categories', 'task_history', 'task_tags',
    'task_comments', 'task_activity'
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
  end loop;

  foreach t in array with_updated loop
    execute format($f$
      drop trigger if exists trg_%I_updated_at on public.%I;
      create trigger trg_%I_updated_at
        before update on public.%I
        for each row execute function public.set_updated_at();
    $f$, t, t, t, t);
  end loop;
end $$;
