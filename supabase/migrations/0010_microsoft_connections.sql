-- =====================================================================
-- LifeOS – Migration 0010: Permanent Microsoft-forbindelse (Outlook OAuth)
-- ---------------------------------------------------------------------
-- Gemmer Microsoft (Microsoft 365 / Outlook) OAuth-tokens pr. bruger, så
-- LifeOS SELV kan læse Outlook-mail og Outlook-kalender via Microsoft Graph
-- (uden Claude Connector som mellemmand).
--
-- Storgaard Biler = Outlook. Privat = Google/Gmail. Arbejdsdata fra Outlook
-- pushes ALDRIG til Google.
--
-- Sikkerhed: RLS sikrer, at hver bruger kun kan røre sin egen forbindelse.
-- (Tokens i klartekst – acceptabelt for denne personlige app med RLS.)
-- =====================================================================

create table if not exists public.microsoft_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  access_token text,
  refresh_token text,
  scope text,
  expiry timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.microsoft_connections enable row level security;

drop policy if exists "Egne data – fuld adgang" on public.microsoft_connections;
create policy "Egne data – fuld adgang"
  on public.microsoft_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_microsoft_connections_updated_at on public.microsoft_connections;
create trigger trg_microsoft_connections_updated_at
  before update on public.microsoft_connections
  for each row execute function public.set_updated_at();
