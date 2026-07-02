-- =====================================================================
-- LifeOS – Migration 0012: Fjern "Lav prioritet" som niveau
-- ---------------------------------------------------------------------
-- Appen har nu kun tre prioritetsniveauer (Haster/Vigtigt/Kan vente) –
-- "Lav prioritet" findes ikke længere som valgmulighed. Enhver
-- eksisterende opgave med priority = 'low' rykkes til 'can_wait', så
-- data stemmer overens med koden (som ikke længere kender 'low').
-- =====================================================================

update public.tasks
  set priority = 'can_wait'
  where priority = 'low';
