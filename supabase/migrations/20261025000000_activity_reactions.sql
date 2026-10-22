-- Reactions on the /activity page: a small, fixed set of emoji a signed-in
-- member can leave on somebody's pull request, the way Slack does.
--
-- Pull requests only. A commit summary is a rolling 30-day window, so a
-- reaction on it would be celebrating something different by next week.
--
-- Keyed by the pull request's URL rather than a foreign key: the Edge
-- Function upserts and prunes github_pull_requests every few hours, and a
-- PR that leaves the window should not take its reactions with it if it
-- comes back. A reaction can only be *added* to a PR the page shows, though —
-- the insert policy checks github_pull_requests, whose own read policy
-- already hides everybody who has not agreed to be shown.

create table public.activity_reactions (
  id               bigint      generated always as identity primary key,
  pull_request_url text        not null,
  user_id          uuid        not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji            text        not null,
  created_at       timestamptz not null default now(),
  constraint activity_reactions_url check (pull_request_url like 'https://github.com/%'),
  -- Keep in step with REACTIONS in app/lib/reactions.ts.
  constraint activity_reactions_emoji check (emoji in ('tada', 'clap', 'fire', 'heart', 'rocket')),
  constraint activity_reactions_once unique (pull_request_url, user_id, emoji)
);

create index activity_reactions_url on public.activity_reactions (pull_request_url);

comment on table public.activity_reactions is
  'Emoji members leave on pull requests shown on /activity; one of each per person per PR.';

alter table public.activity_reactions enable row level security;

create policy "reactions are public"
  on public.activity_reactions for select
  to anon, authenticated
  using (true);

create policy "people react as themselves, to a pull request the page shows"
  on public.activity_reactions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.github_pull_requests pr where pr.url = pull_request_url)
  );

create policy "people take back their own reactions"
  on public.activity_reactions for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- No update: changing a reaction is taking one back and leaving another.
grant select on public.activity_reactions to anon, authenticated;
grant insert, delete on public.activity_reactions to authenticated;

-- ---------------------------------------------------------------- notices

alter table public.notices drop constraint notices_kind_valid;
alter table public.notices add constraint notices_kind_valid check (kind in (
  'application_accepted', 'application_declined', 'proposal_accepted', 'proposal_declined',
  'pull_request_reacted'
));

/*
 * Tells the PR's author somebody reacted — once per person per pull request,
 * however many emoji they then add or take back and add again, so a
 * reaction is news and not noise. Nobody is told about their own.
 *
 * SECURITY DEFINER for record_notice(), which only definer functions may
 * call; see 0008_notices.sql.
 */
create or replace function private.notify_pull_request_reacted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pr    record;
  actor record;
begin
  select p.user_id, p.repo, p.number, p.title into pr
  from public.github_pull_requests p
  where p.url = new.pull_request_url;
  if not found or pr.user_id = new.user_id then
    return null;
  end if;

  if exists (
    select 1 from public.notices n
    where n.recipient_id = pr.user_id
      and n.kind = 'pull_request_reacted'
      and n.payload ->> 'url' = new.pull_request_url
      and n.payload ->> 'actor_id' = new.user_id::text
  ) then
    return null;
  end if;

  select name, username into actor from public.profiles where id = new.user_id;

  perform public.record_notice(pr.user_id, 'pull_request_reacted', jsonb_build_object(
    'url', new.pull_request_url,
    'repo', pr.repo,
    'number', pr.number::text,
    'title', pr.title,
    'emoji', new.emoji,
    'actor_id', new.user_id::text,
    'actor_name', coalesce(actor.name, ''),
    'actor_username', coalesce(actor.username, '')
  ));
  return null;
end;
$$;

revoke all on function private.notify_pull_request_reacted() from public, anon, authenticated;

create trigger notify_pull_request_reacted
  after insert on public.activity_reactions
  for each row execute function private.notify_pull_request_reacted();
