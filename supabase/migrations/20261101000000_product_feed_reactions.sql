-- Reactions on the builders site's product feed.
--
-- The builders site's /activity is a feed of what members' products did —
-- a product added, a new stage, an update, a role opened or filled — read
-- from `events`. Each entry there is one product's day, and it is keyed by
-- the first event of that day: `event:<id>`. The key goes in the same
-- column as a pull request's URL and a commit summary's `commits:<user_id>`;
-- the name stays, as before, rather than break the reads already out there.
--
-- A reaction can only be added to, and only be read on, an event the feed
-- can show: the subqueries read `events` under its own policy, so an event
-- whose actor hid that kind takes its reactions out of sight with it.
--
-- The cast is guarded by the pattern, never left to evaluation order: a
-- pull request's URL must not reach `::bigint`. The two helpers live in
-- `public`, beside event_is_visible, because the policies run as the visitor,
-- who has no use of the `private` schema.

comment on column public.activity_reactions.pull_request_url is
  'What was reacted to: a pull request''s URL, `commits:<user_id>` for a member''s commit summary, or `event:<id>` for a day of a product on the builders feed.';

alter table public.activity_reactions drop constraint activity_reactions_url;
alter table public.activity_reactions add constraint activity_reactions_url check (
  pull_request_url like 'https://github.com/%'
  or pull_request_url ~ '^commits:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or pull_request_url ~ '^event:[0-9]{1,18}$'
);

/* The event behind a key, or null for any other kind of key. */
create or replace function public.reaction_event_id(key text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when key ~ '^event:[0-9]{1,18}$' then substring(key from 7)::bigint end
$$;

grant execute on function public.reaction_event_id(text) to anon, authenticated;

/* The kinds the feed shows; a reaction on any other event is refused. */
create or replace function public.is_feed_event_kind(kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select kind in ('project_created', 'project_stage_changed', 'update_posted', 'seat_opened', 'seat_filled')
$$;

grant execute on function public.is_feed_event_kind(text) to anon, authenticated;

drop policy "people react as themselves, to an entry the page shows" on public.activity_reactions;
create policy "people react as themselves, to an entry the page shows"
  on public.activity_reactions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.github_pull_requests pr where pr.url = pull_request_url)
      or exists (select 1 from public.github_commit_summaries s where 'commits:' || s.user_id::text = pull_request_url)
      or exists (
        select 1 from public.events e
        where e.id = public.reaction_event_id(pull_request_url) and public.is_feed_event_kind(e.kind)
      )
    )
  );

drop policy "reactions are public on an entry the page shows" on public.activity_reactions;
create policy "reactions are public on an entry the page shows"
  on public.activity_reactions for select
  to anon, authenticated
  using (
    exists (select 1 from public.github_pull_requests pr where pr.url = pull_request_url)
    or exists (select 1 from public.github_commit_summaries s where 'commits:' || s.user_id::text = pull_request_url)
    or exists (
      select 1 from public.events e
      where e.id = public.reaction_event_id(pull_request_url) and public.is_feed_event_kind(e.kind)
    )
  );

/*
 * The same notice, once per person per entry and never for one's own, now
 * for a product's day too: it goes to whoever did the thing reacted to, and
 * says `target: event` with the product's title and slug so the inbox can
 * word it as their product's news rather than a pull request.
 */
create or replace function private.notify_pull_request_reacted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner   uuid;
  payload jsonb;
  actor   record;
  pr      record;
  ev      record;
begin
  if new.pull_request_url like 'commits:%' then
    owner := substring(new.pull_request_url from 9)::uuid;
    if not exists (select 1 from public.github_commit_summaries s where s.user_id = owner) then
      return null;
    end if;
    payload := jsonb_build_object('target', 'commits', 'url', new.pull_request_url);
  elsif new.pull_request_url like 'event:%' then
    select e.actor_id, e.kind, e.payload into ev
    from public.events e
    where e.id = public.reaction_event_id(new.pull_request_url);
    if not found then
      return null;
    end if;
    owner := ev.actor_id;
    payload := jsonb_build_object(
      'target', 'event', 'url', new.pull_request_url, 'kind', ev.kind,
      'title', coalesce(ev.payload ->> 'title', ''), 'slug', coalesce(ev.payload ->> 'slug', '')
    );
  else
    select p.user_id, p.repo, p.number, p.title into pr
    from public.github_pull_requests p
    where p.url = new.pull_request_url;
    if not found then
      return null;
    end if;
    owner := pr.user_id;
    payload := jsonb_build_object(
      'url', new.pull_request_url, 'repo', pr.repo, 'number', pr.number::text, 'title', pr.title
    );
  end if;

  if owner = new.user_id then
    return null;
  end if;

  if exists (
    select 1 from public.notices n
    where n.recipient_id = owner
      and n.kind = 'pull_request_reacted'
      and n.payload ->> 'url' = new.pull_request_url
      and n.payload ->> 'actor_id' = new.user_id::text
  ) then
    return null;
  end if;

  select name, username into actor from public.profiles where id = new.user_id;

  perform public.record_notice(owner, 'pull_request_reacted', payload || jsonb_build_object(
    'emoji', new.emoji,
    'actor_id', new.user_id::text,
    'actor_name', coalesce(actor.name, ''),
    'actor_username', coalesce(actor.username, '')
  ));
  return null;
end;
$$;
