-- =====================================================================
-- LifeOS – Migration 0005: Permanent Google-forbindelse (OAuth)
-- ---------------------------------------------------------------------
-- Gemmer Google OAuth-tokens pr. bruger, så LifeOS SELV kan læse fra og
-- skrive til Google Kalender/Gmail (uden assistenten som mellemmand).
--
-- Sikkerhed: RLS sikrer, at hver bruger kun kan røre sin egen forbindelse.
-- (Tokens ligger i klartekst – acceptabelt for denne personlige app med RLS;
-- kan senere krypteres med en server-nøgle.)
-- =====================================================================

create table if not exists public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  access_token text,
  refresh_token text,
  scope text,
  expiry timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;

drop policy if exists "Egne data – fuld adgang" on public.google_connections;
create policy "Egne data – fuld adgang"
  on public.google_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_google_connections_updated_at on public.google_connections;
create trigger trg_google_connections_updated_at
  before update on public.google_connections
  for each row execute function public.set_updated_at();
