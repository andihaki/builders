-- The /activity page shows somebody only once they have said yes.
--
-- 20261024000000_github_activity.sql listed everybody with a GitHub account
-- on their profile and let them opt out. That is the wrong way round: a
-- member never agreed, when they signed up, to their GitHub activity being
-- gathered and shown next to their name here, and that it is public on
-- GitHub does not change it. So it becomes a yes they give themselves:
--
--   - profiles.github_activity_shown, false until the person ticks it;
--   - the Edge Function asks GitHub only about people who said yes, so
--     nothing is gathered for anybody else, not merely hidden;
--   - the read policies show rows only of people who said yes, so taking it
--     back hides them at once, before the function has cleared them.
--
-- Applied before the function's first scheduled run, so no row was ever
-- written under the old rule; the deletes below are a guard, not a cleanup.

alter table public.profiles
  add column github_activity_shown boolean not null default false;

comment on column public.profiles.github_activity_shown is
  'Whether this person agreed to their public GitHub activity being shown on /activity. Off until they turn it on.';

-- The opt-out this replaces lived in activity_hidden; take it back out so the
-- CHECK can return to the trail kinds alone.
update public.profiles
  set activity_hidden = array_remove(activity_hidden, 'github_activity')
  where 'github_activity' = any (activity_hidden);

alter table public.profiles drop constraint profiles_activity_hidden_valid;
alter table public.profiles add constraint profiles_activity_hidden_valid check (
  activity_hidden <@ array[
    'project_created', 'project_stage_changed', 'seat_opened', 'seat_applied',
    'seat_filled', 'task_created', 'task_taken', 'task_done',
    'comment_posted', 'boost_given', 'update_posted']::text[]
);

drop policy "github pull requests are public unless hidden" on public.github_pull_requests;
drop policy "github commit summaries are public unless hidden" on public.github_commit_summaries;

create policy "github pull requests are public once their author agrees"
  on public.github_pull_requests for select
  to anon, authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = user_id and p.github_activity_shown
  ));

create policy "github commit summaries are public once their author agrees"
  on public.github_commit_summaries for select
  to anon, authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = user_id and p.github_activity_shown
  ));

delete from public.github_pull_requests
  where user_id not in (select id from public.profiles where github_activity_shown);
delete from public.github_commit_summaries
  where user_id not in (select id from public.profiles where github_activity_shown);

-- Saying yes fetches at once; taking it back clears at once. Changing the
-- GitHub account does both for whoever has said yes.
create or replace function private.refresh_profile_github()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.github is distinct from old.github
     or new.github_activity_shown is distinct from old.github_activity_shown then
    perform private.request_github_activity_refresh(array[new.id]);
  end if;
  return null;
end;
$$;

drop trigger refresh_github_activity on public.profiles;
create trigger refresh_github_activity
  after update of github, github_activity_shown on public.profiles
  for each row execute function private.refresh_profile_github();
