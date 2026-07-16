-- =====================================================================
-- LifeOS – Migration 0016: Grænser på vedhæftnings-bucket (hærdning)
-- ---------------------------------------------------------------------
-- Bucket'en "task-attachments" (migration 0008) blev oprettet UDEN nogen
-- grænse for filstørrelse eller -type. RLS beskytter allerede mod at andre
-- kan læse/skrive dine filer, så dette er ikke et hul i adgangskontrollen –
-- men uden en grænse kunne en session (eget uheld, en fejl i koden, eller en
-- kompromitteret enhed) fylde storage op med vilkårligt store eller
-- vilkårlige filtyper. Sætter nu samme grænser her i databasen (den
-- egentlige håndhævelse), som allerede vises som forslag i browserens
-- filvælger (accept-attributten i task-attachments.tsx).
-- =====================================================================

update storage.buckets
set
  file_size_limit = 26214400, -- 25 MB pr. fil
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv', 'text/plain'
  ]
where id = 'task-attachments';
