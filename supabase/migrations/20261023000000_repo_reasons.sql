-- Why a repository is listed is now picked, not written: the submitter ticks
-- one or more reasons from a closed set and the directory shows them as tags.
-- A sentence per card made the directory long to read; a tag says the same
-- in two words.
--
-- `why` stays, for the rows that already have a sentence, but a new row may
-- leave it empty. The app requires at least one reason; the database only
-- checks that every reason is a known one, so rows from before still pass.

alter table public.oss_repos alter column why set default '';

alter table public.oss_repos drop constraint oss_repos_why_length;
alter table public.oss_repos add constraint oss_repos_why_length check (
  why = '' or char_length(btrim(why)) between 10 and 280
);

alter table public.oss_repos drop constraint oss_repos_reasons;
alter table public.oss_repos add constraint oss_repos_reasons check (
  reasons <@ array[
    'beginner-friendly',
    'responsive-maintainers',
    'easy-setup',
    'learn-from',
    'our-stack',
    'local-impact'
  ]::text[]
);
