-- =====================================================================
-- LifeOS – Migration 0011: Byttebil-felt på opgaver
-- ---------------------------------------------------------------------
-- Separat fritekstfelt til "har kunden en byttebil?" på Salg-opgaver
-- (Bud på bil / Import af bil) – adskilt fra det generelle Note-felt,
-- så det kan vises som en lille bil-info-badge i opgavelisten og
-- Action-listen uden at skulle parse det ud af almindelige noter.
-- =====================================================================

alter table public.tasks
  add column if not exists trade_in text;
