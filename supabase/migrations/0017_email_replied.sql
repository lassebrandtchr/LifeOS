-- =====================================================================
-- LifeOS – Migration 0017: "Besvaret"-markør på mails
-- ---------------------------------------------------------------------
-- Så vi kan vise en tydelig "Besvaret"-badge på de mails, Lasse har svaret
-- på. Sættes to steder (se features/mail/actions.ts):
--   1) når han sender et svar fra appen (sendEmailReply), og
--   2) når en mail åbnes, og tråden viser, at han allerede har svaret i
--      Gmail/Outlook (repliedByUser).
--
-- Defensiv: er migrationen ikke kørt, springes markøren bare over.
-- =====================================================================

alter table public.emails
  add column if not exists replied boolean not null default false;
