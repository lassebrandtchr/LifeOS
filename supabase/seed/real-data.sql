-- =====================================================================
-- LifeOS – FULD sync af dine connectors (Gmail, Google Kalender, Notion)
-- Genereret af scripts/gen-seed.mjs den 2026-06-24.
-- ---------------------------------------------------------------------
-- 9 mails (hele indbakken) · 71 kalender-aftaler · 15 Notion-sider.
-- Kør HELE dette script i Supabase → SQL Editor (kræver migration 0004).
-- Det kobler data til din bruger (lassebrandtchr@gmail.com) og kan køres flere
-- gange uden at lave dubletter.
-- =====================================================================

-- 1) Mails ------------------------------------------------------------
insert into public.emails
  (user_id, source, external_id, subject, snippet, from_addr, is_read, category, workspace, received_at)
select (select id from auth.users where email = 'lassebrandtchr@gmail.com'), d.source, d.external_id, d.subject, d.snippet, d.from_addr,
       d.is_read, d.category, d.workspace::public.workspace, d.received_at::timestamptz
from (values
  ('gmail', '19ef68ac95b500fc', 'Ordrebekræftelsen Løbeshop.dk', 'Tak for din ordre. Ordrenummer #262008597. Vi pakker og sender din ordre hurtigst muligt.', 'info@loebeshop.dk', false, 'kvittering', 'private', '2026-06-23T22:12:30Z'),
  ('gmail', '19eee9b1b73f0b32', 'Din regning fra 3 – Juni 2026', 'Din regning for denne måned er på 465,17 kr. Beløbet trækkes den 30. juni via MobilePay.', '3danmark@3mail.3.dk', true, 'faktura', 'private', '2026-06-22T09:13:19Z'),
  ('gmail', '19eda137abfef29f', 'SV: Online Fysioterapi/Coaching', 'Hej Mike og Hej Lasse. Du kan indsætte følgende script på sitet (landingsside med jeres logo som aftalt).', 'dj@emcare.dk', true, 'kunde', 'work', '2026-06-18T09:32:41Z'),
  ('gmail', '19eb174acb876bcc', '5 videos to level up your content', 'Get the foundations right and the rest will follow.', 'adrian-per@e.kajabimail.net', true, 'nyhedsbrev', 'private', '2026-06-10T12:14:33Z'),
  ('gmail', '19e825fa2bd69200', 'Your Tickets', 'Hej Lasse Sylvester. Thank you for your booking. Click Show order/Download all tickets below to access your tickets.', 'info@eventbilletten.dk', true, 'kvittering', 'private', '2026-06-01T08:49:25Z'),
  ('gmail', '19e725b98cc91243', 'Your order Retropia Repurposed Disposable Film Camera Lens has been delivered.', 'RETROPIA: Your order just landed! Your parcel has been delivered successfully.', 'support@retro-pia.com', true, 'levering', 'private', '2026-05-29T06:11:04Z'),
  ('gmail', '19e725b967b5a932', 'A shipment from order #121152 has been delivered', 'The last items in your order have been delivered. YunExpress tracking number: YT2613900703956587.', 'support@retro-pia.com', true, 'levering', 'private', '2026-05-29T06:11:05Z'),
  ('gmail', '19e3c16c51fa2b74', 'Få Apple TV+ gratis i 3 måneder', 'Du får Apple TV+ gratis i 3 måneder med din nye Apple-enhed. Dine 3 gratis måneder begynder nu.', 'appletv@insideapple.apple.com', true, 'nyhedsbrev', 'private', '2026-05-18T17:16:21Z'),
  ('gmail', '19dfa0038ac30549', 'Inkluder automatisk flere side- og produktoplysninger via din Meta-pixel', 'Kommende forbedringer af Meta-pixel, der skal gøre din oplevelse med annoncering på Meta-platforme bedre.', 'notification@facebookmail.com', true, 'nyhedsbrev', 'work', '2026-05-05T21:16:49Z')
) as d(source, external_id, subject, snippet, from_addr, is_read, category, workspace, received_at)
on conflict (user_id, external_id) where external_id is not null
  do update set is_read = excluded.is_read, category = excluded.category;

-- 2) Kalender ---------------------------------------------------------
insert into public.calendar_events
  (user_id, source, external_id, title, description, location, starts_at, ends_at, all_day, workspace)
select (select id from auth.users where email = 'lassebrandtchr@gmail.com'), d.source, d.external_id, d.title, d.description::text, d.location::text,
       d.starts_at::timestamptz, d.ends_at::timestamptz, d.all_day, d.workspace::public.workspace
from (values
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260624T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-06-24T08:45:00+02:00', '2026-06-24T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260625T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-06-25T08:45:00+02:00', '2026-06-25T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260626T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-06-26T08:45:00+02:00', '2026-06-26T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260629T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-06-29T08:45:00+02:00', '2026-06-29T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260630T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-06-30T08:45:00+02:00', '2026-06-30T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260701T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-01T08:45:00+02:00', '2026-07-01T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260702T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-02T08:45:00+02:00', '2026-07-02T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260703T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-03T08:45:00+02:00', '2026-07-03T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260706T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-06T08:45:00+02:00', '2026-07-06T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260707T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-07T08:45:00+02:00', '2026-07-07T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260708T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-08T08:45:00+02:00', '2026-07-08T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260709T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-09T08:45:00+02:00', '2026-07-09T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260710T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-10T08:45:00+02:00', '2026-07-10T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260713T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-13T08:45:00+02:00', '2026-07-13T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260714T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-14T08:45:00+02:00', '2026-07-14T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260715T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-15T08:45:00+02:00', '2026-07-15T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260716T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-16T08:45:00+02:00', '2026-07-16T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260717T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-17T08:45:00+02:00', '2026-07-17T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260720T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-20T08:45:00+02:00', '2026-07-20T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260721T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-21T08:45:00+02:00', '2026-07-21T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260722T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-22T08:45:00+02:00', '2026-07-22T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260723T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-23T08:45:00+02:00', '2026-07-23T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260724T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-24T08:45:00+02:00', '2026-07-24T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260727T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-27T08:45:00+02:00', '2026-07-27T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260728T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-28T08:45:00+02:00', '2026-07-28T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260729T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-29T08:45:00+02:00', '2026-07-29T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260730T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-30T08:45:00+02:00', '2026-07-30T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260731T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-07-31T08:45:00+02:00', '2026-07-31T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260803T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-03T08:45:00+02:00', '2026-08-03T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260804T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-04T08:45:00+02:00', '2026-08-04T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260805T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-05T08:45:00+02:00', '2026-08-05T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260806T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-06T08:45:00+02:00', '2026-08-06T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260807T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-07T08:45:00+02:00', '2026-08-07T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260810T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-10T08:45:00+02:00', '2026-08-10T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260811T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-11T08:45:00+02:00', '2026-08-11T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260812T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-12T08:45:00+02:00', '2026-08-12T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260813T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-13T08:45:00+02:00', '2026-08-13T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260814T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-14T08:45:00+02:00', '2026-08-14T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260817T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-17T08:45:00+02:00', '2026-08-17T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260818T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-18T08:45:00+02:00', '2026-08-18T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260819T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-19T08:45:00+02:00', '2026-08-19T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260820T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-20T08:45:00+02:00', '2026-08-20T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260821T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-21T08:45:00+02:00', '2026-08-21T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260824T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-24T08:45:00+02:00', '2026-08-24T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260825T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-25T08:45:00+02:00', '2026-08-25T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260826T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-26T08:45:00+02:00', '2026-08-26T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260827T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-27T08:45:00+02:00', '2026-08-27T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260828T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-28T08:45:00+02:00', '2026-08-28T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260831T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-08-31T08:45:00+02:00', '2026-08-31T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260901T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-01T08:45:00+02:00', '2026-09-01T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260902T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-02T08:45:00+02:00', '2026-09-02T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260903T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-03T08:45:00+02:00', '2026-09-03T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260904T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-04T08:45:00+02:00', '2026-09-04T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260907T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-07T08:45:00+02:00', '2026-09-07T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260908T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-08T08:45:00+02:00', '2026-09-08T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260909T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-09T08:45:00+02:00', '2026-09-09T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260910T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-10T08:45:00+02:00', '2026-09-10T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260911T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-11T08:45:00+02:00', '2026-09-11T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260914T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-14T08:45:00+02:00', '2026-09-14T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260915T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-15T08:45:00+02:00', '2026-09-15T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260916T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-16T08:45:00+02:00', '2026-09-16T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260917T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-17T08:45:00+02:00', '2026-09-17T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260918T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-18T08:45:00+02:00', '2026-09-18T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260921T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-21T08:45:00+02:00', '2026-09-21T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260922T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-22T08:45:00+02:00', '2026-09-22T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260923T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-23T08:45:00+02:00', '2026-09-23T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260924T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-24T08:45:00+02:00', '2026-09-24T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260925T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-25T08:45:00+02:00', '2026-09-25T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260928T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-28T08:45:00+02:00', '2026-09-28T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'a9d72667eb8849088190e72a236ce813_20260929T064500Z', 'Arbejde - Storgaard Biler', null, null, '2026-09-29T08:45:00+02:00', '2026-09-29T17:00:00+02:00', false, 'work'),
  ('google_calendar', 'clh32d34cgs3cbb475h3cb9k60o6abb275j36b9p75i36p9j6krj0o9ock_20260922T075500Z', 'Jackie''s fødselsdag', null, 'Hermelintoften 19, 6760 Ribe, Danmark', '2026-09-22T09:55:00+02:00', '2026-09-22T21:55:00+02:00', false, 'private')
) as d(source, external_id, title, description, location, starts_at, ends_at, all_day, workspace)
on conflict (user_id, external_id) where external_id is not null do nothing;

-- 3) Notion -----------------------------------------------------------
insert into public.notion_items
  (user_id, external_id, title, type, url, snippet, edited_at, workspace)
select (select id from auth.users where email = 'lassebrandtchr@gmail.com'), d.external_id, d.title, d.type, d.url, d.snippet,
       d.edited_at::timestamptz, d.workspace::public.workspace
from (values
  ('aa52ee19-99fd-4836-9d55-ae878d562ca6', 'Storgaard Biler A/S', 'page', 'https://app.notion.com/p/aa52ee1999fd48369d55ae878d562ca6', 'Forsiden for Storgaard Biler A/S.', '2026-06-23T13:53:00Z', 'work'),
  ('1795a66f-b119-478e-a8cb-3dc6706fdd97', 'Vigtige processer i salg (import, huskeliste etc)', 'page', 'https://app.notion.com/p/1795a66fb119478ea8cb3dc6706fdd97', 'Leasingkontrakt til Storgaard Biler (Subleasing).', '2026-05-27T11:16:00Z', 'work'),
  ('383c8f6e-bf2c-80ee-b8ed-d723287c015e', 'Yo', 'page', 'https://app.notion.com/p/383c8f6ebf2c80eeb8edd723287c015e', 'I tirsdags var det Magnus'' tur til at fejre, at han har været hos Storgaard Biler i hele 20 år.', '2026-06-18T13:17:00Z', 'work'),
  ('96e31464-c535-4d7d-9099-e03df8cff5bf', 'Facebook, Instagram, Tik-Tok og YouTube', 'page', 'https://app.notion.com/p/96e31464c5354d7d9099e03df8cff5bf', 'Slå katten af tønden hos Storgaard Biler – idéer til sociale medier.', '2026-05-27T13:26:00Z', 'work'),
  ('d5ab7719-94e1-4431-b6d0-c394274d4ea1', 'Ideer til arbejdsfordelingen - Salg 2023', 'page', 'https://app.notion.com/p/d5ab771994e14431b6d0c394274d4ea1', 'Få mere tid til at være kreativ med idéer til at øge kendskabet til Storgaard Biler og Storgaard Leasing.', '2026-01-08T13:54:00Z', 'work'),
  ('361c8f6e-bf2c-802d-94d4-c4bd39918144', 'Møde med Trustpilot vedr. Plus Plan maj 2026', 'page', 'https://app.notion.com/p/361c8f6ebf2c802d94d4c4bd39918144', 'Lasse bekræftede høj digital betydning, svag nuværende review-opsamling og interesse i et automatiseret setup.', '2026-05-15T06:35:00Z', 'work'),
  ('33cc8f6e-bf2c-80c1-b0ce-d4b1fd39da77', 'Ting til morgenmødet', 'page', 'https://app.notion.com/p/33cc8f6ebf2c80c1b0ced4b1fd39da77', 'Punkter til morgenmødet.', '2026-06-22T08:55:00Z', 'work'),
  ('374c8f6e-bf2c-80f7-9c1e-e5d469bfc359', 'Ret disse biler inde på bilinfo vedr. løbetid på leasingpris!', 'page', 'https://app.notion.com/p/374c8f6ebf2c80f79c1ee5d469bfc359', 'Liste over biler der skal rettes på bilinfo vedr. løbetid på leasingpris.', '2026-06-08T10:02:00Z', 'work'),
  ('207c8f6e-bf2c-8031-ac93-de249149ba6e', 'Biler der skal klargøres etc.', 'page', 'https://app.notion.com/p/207c8f6ebf2c8031ac93de249149ba6e', 'Biler der skal klargøres.', '2026-01-08T13:54:00Z', 'work'),
  ('357c8f6e-bf2c-8028-a2a0-ff4c6772e321', 'CarBoost statusmøde maj 2026', 'page', 'https://app.notion.com/p/357c8f6ebf2c8028a2a0ff4c6772e321', 'Med Christoffer fra Carboost. Salget går godt, men udbuddet af biler er den aktuelle flaskehals.', '2026-05-05T08:48:00Z', 'work'),
  ('2cbc8f6e-bf2c-8071-a335-cb1bd40e0fac', 'Tekst med FED skrift (og andet)', 'page', 'https://app.notion.com/p/2cbc8f6ebf2c8071a335cb1bd40e0fac', 'Tekst med fed skrift og andre formateringstricks.', '2026-03-11T10:26:00Z', 'work'),
  ('247c8f6e-bf2c-8043-ae6e-d9bd6b42571e', 'Importbil – Tesla Model 3 SR/Long Range fra 2021 (budget max 205.000 kr)', 'page', 'https://app.notion.com/p/247c8f6ebf2c8043ae6ed9bd6b42571e', 'Tesla Model 3 Standard Range RWD, fra 2021 og frem, sort/hvid/grå, 50-70.000 km.', '2026-01-08T13:54:00Z', 'work'),
  ('35dc8f6e-bf2c-806d-b88a-f3d02d8e5b00', 'Ideer til automationer der skal bygges via Codex', 'page', 'https://app.notion.com/p/35dc8f6ebf2c806db88af3d02d8e5b00', 'Automationer: tjek at salgsbiler på bilinfo og Au2office har arbejdskort (teknisk + kosmetisk).', '2026-05-11T09:08:00Z', 'work'),
  ('1c0c8f6e-bf2c-80ca-88fc-ce843c59dace', 'Design - Flyers til biler ved værkstedsbesøg', 'page', 'https://app.notion.com/p/1c0c8f6ebf2c80ca88fcce843c59dace', 'Flyers til biler ved værkstedsbesøg.', '2026-01-08T13:54:00Z', 'work'),
  ('328c8f6e-bf2c-807e-90ed-cf781c9a79fa', 'Videoidé: Kling Motion Control om vores kunder', 'page', 'https://app.notion.com/p/328c8f6ebf2c807e90edcf781c9a79fa', 'Video om hvad kunderne synes om at handle hos Storgaard Biler.', '2026-04-09T10:06:00Z', 'work')
) as d(external_id, title, type, url, snippet, edited_at, workspace)
on conflict (user_id, external_id) where external_id is not null do nothing;

-- 4) Markér connectorne som forbundne i Integration Center ------------
insert into public.integrations (user_id, connector_id, enabled, status, last_synced_at)
select (select id from auth.users where email = 'lassebrandtchr@gmail.com'), d.connector_id, true, 'connected', now()
from (values ('gmail'), ('google_calendar'), ('notion')) as d(connector_id)
on conflict (user_id, connector_id)
  do update set enabled = excluded.enabled,
                status = excluded.status,
                last_synced_at = excluded.last_synced_at;
