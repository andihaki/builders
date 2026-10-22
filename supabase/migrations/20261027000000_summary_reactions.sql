-- Reactions on the commit summary too, not only on pull requests.
--
-- A summary is keyed `commits:<user_id>` — the same key the /activity page
-- gives the entry — and lives in the column that until now only held pull
-- request URLs. The name stays: renaming it under a running deploy would
-- break the reads already out there. A reaction on a summary cheers the
-- person's work on their own repositories as a whole, whatever the rolling
-- window holds at the time.
--
-- As with pull requests, a reaction can only be added to a summary the page
-- shows: the insert policy reads github_commit_summaries, whose own read
-- policy hides everybody who has not agreed to be shown.

comment on column public.activity_reactions.pull_request_url is
  'What was reacted to: a pull request''s URL, or `commits:<user_id>` for a member''s commit summary.';

alter table public.activity_reactions drop constraint activity_reactions_url;
alter table public.activity_reactions add constraint activity_reactions_url check (
  pull_request_url like 'https://github.com/%'
  or pull_request_url ~ '^commits:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

drop policy "people react as themselves, to a pull request the page shows" on public.activity_reactions;
create policy "people react as themselves, to an entry the page shows"
  on public.activity_reactions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.github_pull_requests pr where pr.url = pull_request_url)
      or exists (select 1 from public.github_commit_summaries s where 'commits:' || s.user_id::text = pull_request_url)
    )
  );

/*
 * The same notice as before, now for a summary as well: once per person per
 * entry, never for one's own. A summary's notice says `target: commits` so
 * the inbox can word it as work on their own repositories, not a PR.
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
begin
  if new.pull_request_url like 'commits:%' then
    owner := substring(new.pull_request_url from 9)::uuid;
    if not exists (select 1 from public.github_commit_summaries s where s.user_id = owner) then
      return null;
    end if;
    payload := jsonb_build_object('target', 'commits', 'url', new.pull_request_url);
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
