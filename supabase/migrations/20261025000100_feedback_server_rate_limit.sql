-- All feedback writes now go through the server action. The anon key is public,
-- so leaving execute on submit_feedback() would let callers skip its friendly
-- form response and bypass any limit applied only in Next.js.

alter table public.feedback
  add column guest_fingerprint text check (guest_fingerprint ~ '^[0-9a-f]{64}$');

create index feedback_guest_fingerprint_recent_idx
  on public.feedback (guest_fingerprint, created_at desc)
  where guest_fingerprint is not null;

drop function public.submit_feedback(text, text, text);

create function public.submit_feedback(
  feedback_kind text,
  message text,
  contact text,
  submitter_id uuid,
  guest_fingerprint_arg text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  said       text := left(btrim(coalesce(message, '')), 2000);
  reply_to   text := left(btrim(coalesce(contact, '')), 254);
  recent     int;
begin
  if feedback_kind is null or feedback_kind not in ('bug', 'idea', 'confusing', 'praise', 'other') then
    raise exception 'Pilih dulu jenis masukannya.' using errcode = '22023';
  end if;
  if char_length(said) < 10 then
    raise exception 'Ceritakan masukanmu sedikit lebih panjang.' using errcode = '22023';
  end if;
  if (submitter_id is null) = (guest_fingerprint_arg is null) then
    raise exception 'Feedback sender identity is invalid.' using errcode = '22023';
  end if;

  if submitter_id is not null then
    -- Serialize simultaneous submissions for one account so the fifth write
    -- cannot race another request past the cap.
    perform pg_advisory_xact_lock(hashtextextended('feedback:user:' || submitter_id::text, 0));

    select count(*) into recent
    from public.feedback f
    where f.author_id = submitter_id and f.created_at > now() - interval '1 hour';
  else
    if guest_fingerprint_arg !~ '^[0-9a-f]{64}$' then
      raise exception 'Guest feedback identity is invalid.' using errcode = '22023';
    end if;

    -- The fingerprint is an HMAC of Netlify's client IP, created only by the
    -- server action. The raw address is never stored.
    perform pg_advisory_xact_lock(hashtextextended('feedback:guest:' || guest_fingerprint_arg, 0));

    select count(*) into recent
    from public.feedback f
    where f.guest_fingerprint = guest_fingerprint_arg and f.created_at > now() - interval '1 hour';
  end if;

  if recent >= 5 then
    raise exception 'Feedback rate limit reached.' using errcode = '53400';
  end if;

  insert into public.feedback (author_id, kind, message, contact, guest_fingerprint)
  values (
    submitter_id,
    feedback_kind,
    said,
    reply_to,
    case when submitter_id is null then guest_fingerprint_arg else null end
  );
end;
$$;

revoke all on function public.submit_feedback(text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.submit_feedback(text, text, text, uuid, text) to service_role;

comment on column public.feedback.guest_fingerprint is
  'HMAC of the guest IP for rate limiting; retained with the feedback row. The raw IP is not stored.';
