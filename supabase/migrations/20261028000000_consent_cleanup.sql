-- Taking back the yes to /activity takes back everything it let out.
--
-- 20261024000100_github_activity_opt_in.sql made /activity a yes a member
-- gives, and the read policies on github_pull_requests and
-- github_commit_summaries hide whoever has not given it. Two things written
-- since went round that:
--
--   - activity_reactions was readable by anyone, whole. Its key is the
--     entry's own: the pull request's URL, or `commits:<user_id>`. So a
--     member who took their yes back still had their pull request URLs, and
--     who cheered them, readable through the API.
--   - refresh-github-activity puts a repository forward to oss_repos with
--     `submitted_by` set to the member and `why` naming them and their pull
--     request. Nothing removed that when they took their yes back, and once
--     an admin approves the repository the row is public.
--
-- Reactions now read only on an entry the page shows. The subqueries go
-- through those tables' own read policies, so the consent check is theirs and
-- is not restated here; taking the yes back hides the reactions at once, and
-- they come back with the entry if the yes is given again.
--
-- The Edge Function now clears the suggestions it made for somebody when it
-- forgets them (see forgetSuggestions in its index.ts). The statements below
-- do the same once for whoever is already not shown.

drop policy "reactions are public" on public.activity_reactions;
create policy "reactions are public on an entry the page shows"
  on public.activity_reactions for select
  to anon, authenticated
  using (
    exists (select 1 from public.github_pull_requests pr where pr.url = pull_request_url)
    or exists (select 1 from public.github_commit_summaries s where 'commits:' || s.user_id::text = pull_request_url)
  );

-- A suggestion still waiting goes. One already reviewed stays, so an approved
-- repository stays listed and a rejected one is not put forward again
-- (oss_repos_once), but no longer says who it came from.
delete from public.oss_repos r
  where r.status = 'pending'
    and r.why like 'PR dari @%'
    and not exists (select 1 from public.profiles p where p.id = r.submitted_by and p.github_activity_shown);

update public.oss_repos r
  set submitted_by = null, why = ''
  where r.status <> 'pending'
    and r.why like 'PR dari @%'
    and r.submitted_by is not null
    and not exists (select 1 from public.profiles p where p.id = r.submitted_by and p.github_activity_shown);
