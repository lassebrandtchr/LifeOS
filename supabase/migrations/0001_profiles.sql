-- =====================================================================
-- LifeOS – Migration 0001: Profiles + auth-fundament
-- ---------------------------------------------------------------------
-- Kør denne i Supabase (SQL Editor) EFTER du har oprettet dit projekt.
-- Den opretter "profiles"-tabellen, slår Row Level Security til og sørger
-- for, at en profil oprettes automatisk, når en bruger registrerer sig.
--
-- Arkitektur: bygget til flere brugere fra start (alt hænger på user_id),
-- selvom LifeOS i version 1 kun har én ejer.
-- =====================================================================

-- Bruges til gen_random_uuid()
create extension if not exists pgcrypto;

-- --------------------------------------------------------------------
-- Hjælpefunktion: opdaterer automatisk updated_at ved hver ændring.
-- --------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------
-- Tabel: profiles
-- --------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  -- Forberedt til fremtidig tofaktor-godkendelse (2FA) – ikke aktivt endnu.
  two_factor_enabled boolean not null default false,
  two_factor_secret text,
  backup_codes text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------
-- Row Level Security: en bruger må kun se/ændre sin EGEN profil.
-- --------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Egen profil – læs" on public.profiles;
create policy "Egen profil – læs"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Egen profil – opret" on public.profiles;
create policy "Egen profil – opret"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Egen profil – opdater" on public.profiles;
create policy "Egen profil – opdater"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- Auto-opret profil ved nyt login/registrering.
-- Læser navn fra brugerens metadata (sat ved "Opret konto").
-- --------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
