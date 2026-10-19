-- The open source catalogue moves from code into the database, and gains a
-- way in for everybody: any member can put forward a repository — one of
-- their own, or one they recommend — and a site admin approves it before it
-- reaches the directory.
--
-- Two tables:
--
--   site_admins — who curates the catalogue. Deliberately not a column on
--                 profiles: profiles are updated by their owner, and a column
--                 there would let anybody make themselves an admin. Rows are
--                 added by hand in the SQL editor:
--                   insert into public.site_admins (user_id)
--                   select id from public.profiles where username = '...';
--
--   oss_repos   — the catalogue itself. A submission arrives as `pending`;
--                 only an admin can approve, reject, edit or remove it. The
--                 directory reads `approved` rows only.

create table public.site_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.site_admins is
  'Members who curate the open source catalogue. Added by hand; nothing in the app writes here.';

alter table public.site_admins enable row level security;

-- A member may see whether they themselves are an admin, and nothing more.
create policy "people see their own admin row"
  on public.site_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.site_admins to authenticated;

/*
 * Whether the person asking is a site admin.
 *
 * SECURITY DEFINER so the policies on oss_repos can ask without the caller
 * needing to read site_admins, and so a policy on site_admins itself could
 * use it without recursing. search_path is pinned for the usual reason.
 */
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.site_admins where user_id = auth.uid());
$$;

revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

create table public.oss_repos (
  id            bigint generated always as identity primary key,
  -- `owner/name`, lower-cased by the app, same shape as oss_contributions.
  repo          text not null,
  -- internal: maintained by us. recommended: somebody else's, vouched for.
  list          text not null default 'recommended',
  -- Why it is listed, from a short closed set the directory filters on.
  reasons       text[] not null default '{}',
  -- Why it is listed, in the submitter's own words. Required: a repo with no
  -- stated reason is exactly the kind of listing this replaces.
  why           text not null,
  -- One line on what it is. Empty falls back to GitHub's own description.
  summary       text not null default '',
  -- A hand-set badge: its maintainers are Indonesian.
  indonesian    boolean not null default false,
  -- The label its maintainers use for starter issues.
  starter_label text not null default 'good first issue',
  status        text not null default 'pending',
  submitted_by  uuid references public.profiles (id) on delete set null,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),

  constraint oss_repos_repo_shape check (
    repo = lower(repo)
    and repo ~ '^[a-z0-9](?:[a-z0-9-]{0,38})/[a-z0-9._-]{1,100}$'
  ),
  constraint oss_repos_once unique (repo),
  constraint oss_repos_list check (list in ('internal', 'recommended')),
  constraint oss_repos_reasons check (
    reasons <@ array['our-stack', 'beginner-friendly', 'local-impact']::text[]
  ),
  constraint oss_repos_why_length check (char_length(btrim(why)) between 10 and 280),
  constraint oss_repos_summary_length check (char_length(summary) <= 160),
  constraint oss_repos_starter_label_length check (char_length(starter_label) <= 50),
  constraint oss_repos_status check (status in ('pending', 'approved', 'rejected'))
);

create index oss_repos_status on public.oss_repos (status);

comment on table public.oss_repos is
  'The open source catalogue: member submissions, approved by a site admin before the directory shows them.';

alter table public.oss_repos enable row level security;

-- The directory is public; a submission is visible to whoever made it, and
-- the queue to admins.
create policy "approved repos are public, submissions to their author and admins"
  on public.oss_repos for select
  to anon, authenticated
  using (
    status = 'approved'
    or submitted_by = (select auth.uid())
    or (select public.is_site_admin())
  );

-- A member submits under their own name, and only as pending. An admin may
-- add a repo already approved.
create policy "members submit, admins add"
  on public.oss_repos for insert
  to authenticated
  with check (
    (submitted_by = (select auth.uid()) and status = 'pending' and reviewed_by is null)
    or (select public.is_site_admin())
  );

-- Reviewing and editing are an admin's alone. RLS is row level, not column
-- level, so a submitter-update policy would let them approve themselves.
create policy "admins review and edit"
  on public.oss_repos for update
  to authenticated
  using ((select public.is_site_admin()))
  with check ((select public.is_site_admin()));

-- A member may withdraw their own submission while it waits; admins may
-- remove anything.
create policy "authors withdraw pending, admins remove"
  on public.oss_repos for delete
  to authenticated
  using (
    (submitted_by = (select auth.uid()) and status = 'pending')
    or (select public.is_site_admin())
  );

grant select on public.oss_repos to anon, authenticated;
grant insert, update, delete on public.oss_repos to authenticated;

-- The one listing that is a fact rather than a recommendation: this site's
-- own repository. Everything else arrives through the submission form.
insert into public.oss_repos (repo, list, reasons, why, summary, status)
values (
  'zikrulihsan/builders',
  'internal',
  array['beginner-friendly'],
  'Repo milik kita sendiri. Reviewer-nya teman sendiri, jadi PR pertamamu dibaca orang yang kenal kamu.',
  'Direktori project yang bisa dikontribusikan. Next.js + Supabase, MIT.',
  'approved'
);
