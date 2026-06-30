-- =====================================================================
-- LifeOS – Migration 0008: Filvedhæftning til opgaver (Supabase Storage)
-- ---------------------------------------------------------------------
-- Opretter en privat storage-bucket "task-attachments" og RLS-politikker, så
-- hver bruger kun kan se/uploade/slette sine EGNE filer. Filer gemmes som
--   <user_id>/<task_id>/<filnavn>
-- så den første mappe = bruger-id'et bruges til adgangskontrol.
-- Idempotent (kan køres flere gange).
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

-- Læs egne filer
drop policy if exists "Opgavefiler – læs egne" on storage.objects;
create policy "Opgavefiler – læs egne"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upload egne filer
drop policy if exists "Opgavefiler – upload egne" on storage.objects;
create policy "Opgavefiler – upload egne"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Opdater egne filer
drop policy if exists "Opgavefiler – opdater egne" on storage.objects;
create policy "Opgavefiler – opdater egne"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Slet egne filer
drop policy if exists "Opgavefiler – slet egne" on storage.objects;
create policy "Opgavefiler – slet egne"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
