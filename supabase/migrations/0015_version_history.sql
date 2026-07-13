-- =====================================================================
-- LifeOS – Migration 0015: Versionshistorik ("gå tilbage til noget slettet")
-- ---------------------------------------------------------------------
-- Gemmer automatisk en kopi af den FORRIGE udgave, HVER gang en opgave
-- eller notesblokken ændres. Så kan man altid gå tilbage og hente tekst,
-- man kom til at slette.
--
-- Hvorfor en database-TRIGGER og ikke kode i appen?
--   • Den kan ikke "glemmes": den fyrer på ENHVER ændring, uanset hvor i
--     appen ændringen kom fra.
--   • Den er atomisk: kopien gemmes i samme transaktion som ændringen –
--     enten sker begge dele, eller ingen af dem.
--   • Den koster ingenting i appen: ingen ekstra netværkskald, så den gør
--     IKKE gemningen langsommere (vigtigt – vi har lige jagtet langsomme
--     gemninger).
--
-- Der SLETTES aldrig noget her; historikken vokser kun.
-- =====================================================================

-- ─────────────────────── 1) Opgaver → task_history ────────────────────
-- task_history findes allerede (migration 0003) og har en ubrugt
-- snapshot-kolonne. Vi fylder den nu med den forrige udgave af rækken.

create or replace function public.snapshot_task_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_history (user_id, task_id, title, action, snapshot)
  values (OLD.user_id, OLD.id, OLD.title, 'edited', to_jsonb(OLD));
  return NEW;
end;
$$;

drop trigger if exists tasks_snapshot_history on public.tasks;
create trigger tasks_snapshot_history
  before update on public.tasks
  for each row
  -- Kun når noget MENINGSFULDT er ændret. Rene flytninger (position) eller
  -- et opdateret tidsstempel skal ikke fylde historikken op.
  when (
    OLD.title       is distinct from NEW.title
    or OLD.notes       is distinct from NEW.notes
    or OLD.description is distinct from NEW.description
    or OLD.trade_in    is distinct from NEW.trade_in
    or OLD.customer    is distinct from NEW.customer
    or OLD.priority    is distinct from NEW.priority
    or OLD.status      is distinct from NEW.status
    or OLD.category    is distinct from NEW.category
    or OLD.workspace   is distinct from NEW.workspace
    or OLD.deadline    is distinct from NEW.deadline
  )
  execute function public.snapshot_task_history();

create index if not exists task_history_task_created_idx
  on public.task_history (task_id, created_at desc);

-- ────────────────── 2) Notesblok → scratchpad_versions ────────────────

create table if not exists public.scratchpad_versions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

alter table public.scratchpad_versions enable row level security;

drop policy if exists "Notesblok-historik – læs egen" on public.scratchpad_versions;
create policy "Notesblok-historik – læs egen"
  on public.scratchpad_versions for select to authenticated
  using (auth.uid() = user_id);

create index if not exists scratchpad_versions_user_created_idx
  on public.scratchpad_versions (user_id, created_at desc);

create or replace function public.snapshot_scratchpad_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Gem KUN den forrige udgave, og kun hvis den rent faktisk indeholdt noget.
  -- (En tom "forrige udgave" er ikke værd at kunne gå tilbage til.)
  if OLD.content is not null and OLD.content <> '' then
    insert into public.scratchpad_versions (user_id, content)
    values (OLD.user_id, OLD.content);
  end if;
  return NEW;
end;
$$;

drop trigger if exists scratchpad_snapshot_version on public.scratchpad;
create trigger scratchpad_snapshot_version
  before update on public.scratchpad
  for each row
  when (OLD.content is distinct from NEW.content)
  execute function public.snapshot_scratchpad_version();
