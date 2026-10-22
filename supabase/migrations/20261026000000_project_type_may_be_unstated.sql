-- Lets a project be added without choosing its kind again.
--
-- Adding a project without choosing its kind failed in production with
-- "violates check constraint projects_type_valid": the form sends '' — "not
-- stated", which 20260829120000_project_types.sql allows on purpose — and the
-- live constraint did not accept it.
--
-- The live database had drifted from this repository. Besides '' and the
-- kinds the app offers (pet, community, product, commercial), it holds
-- 'launch', 'talent' and 'feedback' — 33 of 42 projects on 2026-10-22,
-- created by members between 2026-08-30 and 2026-10-06 — which no code in
-- this repository ever wrote. Restating the repository's list would reject
-- those rows, so this accepts both lists until it is decided which one the
-- product keeps. Nothing is rewritten.

alter table public.projects drop constraint if exists projects_type_valid;
alter table public.projects
  add constraint projects_type_valid
  check (project_type in (
    '', 'pet', 'community', 'product', 'commercial',
    'launch', 'talent', 'feedback'
  ));
