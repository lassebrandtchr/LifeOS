-- =====================================================================
-- LifeOS – Migration 0018: Faktura-påmindelser
-- ---------------------------------------------------------------------
-- To felter på mails, så vi kan minde om ubetalte fakturaer:
--   invoice_due_date  – forfaldsdato (udtrukket af mailtekst/PDF, eller sat
--                       manuelt af Lasse). Ren dato uden klokkeslæt.
--   invoice_paid      – har Lasse markeret fakturaen som betalt? Så stopper
--                       påmindelserne.
--
-- Kun mails med kategori 'faktura' bruger felterne. Defensiv: er migrationen
-- ikke kørt, springes faktura-funktionerne bare pænt over.
-- =====================================================================

alter table public.emails
  add column if not exists invoice_due_date date,
  add column if not exists invoice_paid boolean not null default false;
