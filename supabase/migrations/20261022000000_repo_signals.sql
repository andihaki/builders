-- What GitHub says about each repository the directory lists, kept in the
-- database so a page view never has to ask GitHub itself.
--
-- Before this, every uncached render of the directory called GitHub twice per
-- repository, from Netlify, inside the visitor's request: slow, and a few cold
-- instances at once were enough to hit the search API's rate limit. Now one
-- job — the refresh-repos Edge Function, scheduled and triggered by
-- 20261022000100_refresh_repo_signals.sql — writes here, and the site reads.
--
-- Raw facts only. The PR tier a card shows ("actively accepting", "looking
-- for a first contributor", "inactive"…) is worked out from these columns in
-- app/lib/directory.ts, so changing its rules is a code change, not a data
-- migration.

create table public.repo_signals (
  -- `owner/name`, lower-cased: the same key as oss_repos.repo.
  repo         text primary key,
  stars        integer,
  language     text not null default '',
  description  text not null default '',
  pushed_at    timestamptz,
  archived     boolean not null default false,
  -- Pull requests merged in the last 90 days whose author GitHub does not
  -- count as an owner, member or collaborator, bots excluded. Null when the
  -- search failed: unknown, which the directory treats differently from none.
  outside_prs  integer,
  checked_at   timestamptz not null default now(),
  -- Why the last check could not answer in full; null when it did.
  last_error   text,

  constraint repo_signals_repo_shape check (
    repo = lower(repo)
    and repo ~ '^[a-z0-9](?:[a-z0-9-]{0,38})/[a-z0-9._-]{1,100}$'
  )
);

comment on table public.repo_signals is
  'GitHub facts per listed repository, written by the refresh-repos Edge Function. Public to read; nothing in the app writes here.';

alter table public.repo_signals enable row level security;

-- Public facts about public repositories. There is no write policy on
-- purpose: only the Edge Function, with the service role, writes.
create policy "repo signals are public"
  on public.repo_signals for select
  to anon, authenticated
  using (true);

grant select on public.repo_signals to anon, authenticated;
