-- Contributions the directory knows about because GitHub says so.
--
-- oss_contributions is what members type in themselves. This is the other
-- half: every repository where a member who agreed to be shown on /activity
-- has had a pull request merged, written by the refresh-github-activity Edge
-- Function as it sees them. The directory's "a friend has contributed"
-- badges and each profile's open source record read both.
--
-- Separate from github_pull_requests on purpose: that one keeps a rolling 90
-- days for the feed, and a contribution does not stop being one after three
-- months. Rows here only grow — until the person takes their yes back or
-- clears their GitHub account, when the function deletes them with the rest.
--
-- The same function also puts a repository nobody has listed yet forward to
-- oss_repos as `pending`, for an admin to approve: a merged pull request is
-- a better reason to look at a repository than most suggestions get. One
-- that was ever rejected is not put forward again — oss_repos_once sees to
-- that.

create table public.github_contributions (
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  repo            text        not null,
  first_merged_at timestamptz not null,
  last_merged_at  timestamptz not null,
  primary key (user_id, repo),
  constraint github_contributions_repo_shape check (
    repo = lower(repo)
    and repo ~ '^[a-z0-9](?:[a-z0-9-]{0,38})/[a-z0-9._-]{1,100}$'
  )
);

create index github_contributions_repo on public.github_contributions (repo);

comment on table public.github_contributions is
  'Repositories where a member has had a pull request merged, as GitHub reports it; written only by the refresh-github-activity Edge Function.';

alter table public.github_contributions enable row level security;

create policy "github contributions are public once their author agrees"
  on public.github_contributions for select
  to anon, authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = user_id and p.github_activity_shown
  ));

grant select on public.github_contributions to anon, authenticated;
