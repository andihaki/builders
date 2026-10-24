-- Pull requests to a member's own repositories, kept alongside the ones to
-- everybody else's, so /activity can show either or both — the way the
-- directory toggles local and global.
--
-- "Own" is what refresh-github-activity decides: a repository under the
-- member's login, or of an organisation they belong to (GitHub's
-- authorAssociation OWNER or MEMBER, or an organisation on their public
-- profile). Only the others are contributions: own pull requests never
-- become a github_contributions row or a catalogue suggestion.
--
-- Apply before deploying the function that writes the column. Rows already
-- stored are all somebody else's repositories, under the old rule, so the
-- default is right for them.

alter table public.github_pull_requests
  add column own boolean not null default false;

comment on column public.github_pull_requests.own is
  'Whether the repository is the member''s own or their organisation''s: their own work, not a contribution. Set by refresh-github-activity.';
