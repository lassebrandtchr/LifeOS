-- =====================================================================
-- LifeOS – Migration 0014: "Tekst med FED skrift" (notesblok) i skyen
-- ---------------------------------------------------------------------
-- Notesblokken blev før KUN gemt i browserens localStorage. Det er privat
-- pr. browser OG pr. enhed – derfor stod teksten, man skrev på computeren,
-- ikke i telefonen (og omvendt). Her flyttes den ind i databasen, så den
-- følger med Lasse på tværs af alle enheder.
--
-- Én række pr. bruger (user_id er primærnøgle). Koden er defensiv: er denne
-- migration ikke kørt endnu, falder appen tilbage til localStorage som før,
-- så intet går tabt.
-- =====================================================================

create table if not exists public.scratchpad (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.scratchpad enable row level security;

-- Hver bruger kan kun se og redigere sin EGEN notesblok.
drop policy if exists "Notesblok – læs egen" on public.scratchpad;
create policy "Notesblok – læs egen"
  on public.scratchpad for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Notesblok – opret egen" on public.scratchpad;
create policy "Notesblok – opret egen"
  on public.scratchpad for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Notesblok – opdater egen" on public.scratchpad;
create policy "Notesblok – opdater egen"
  on public.scratchpad for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
