-- =====================================================================
-- LifeOS – Migration 0013: Kundeinfo på opgaver
-- ---------------------------------------------------------------------
-- Valgfri kundekontakt knyttet til en opgave (fx en bilhandel):
-- navn, telefon, e-mail og adresse. Gemmes som JSONB i én kolonne, så
-- tomme felter kan udelades, og strukturen let kan udvides senere.
-- Udfyldes ét eller flere felter, vises en kunde-markør på opgaven i
-- Action-listen og på opgavekortet.
--
-- Koden er defensiv: hvis denne migration ikke er kørt endnu, gemmes
-- opgaven stadig (bare uden kundeinfo) – se updateTask i
-- features/tasks/actions.ts.
-- =====================================================================

alter table public.tasks
  add column if not exists customer jsonb;
