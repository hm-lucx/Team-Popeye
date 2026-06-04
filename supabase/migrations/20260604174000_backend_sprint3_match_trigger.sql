begin;

create or replace function private.create_match_for_user(
  p_user_id uuid,
  p_local_day date,
  p_expires_in_minutes integer default 15
)
returns public.matches
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_candidate record;
  v_match public.matches;
  v_user_one_id uuid;
  v_user_two_id uuid;
begin
  if p_user_id is null then
    raise exception 'user_id_required';
  end if;

  if p_expires_in_minutes is null or p_expires_in_minutes < 1 or p_expires_in_minutes > 1440 then
    raise exception 'invalid_match_expiry_minutes';
  end if;

  select *
  into v_candidate
  from private.find_match_candidate_for_user(p_user_id, p_local_day, null);

  if not found then
    return null;
  end if;

  perform private.lock_user_pair(p_user_id, v_candidate.candidate_user_id);

  select *
  into v_candidate
  from private.find_match_candidate_for_user(
    p_user_id,
    p_local_day,
    v_candidate.candidate_user_id
  );

  if not found then
    return null;
  end if;

  if p_user_id::text <= v_candidate.candidate_user_id::text then
    v_user_one_id := p_user_id;
    v_user_two_id := v_candidate.candidate_user_id;
  else
    v_user_one_id := v_candidate.candidate_user_id;
    v_user_two_id := p_user_id;
  end if;

  begin
    insert into public.matches (
      user_one_id,
      user_two_id,
      local_day,
      overlap_starts_at,
      overlap_ends_at,
      status,
      expires_at
    )
    values (
      v_user_one_id,
      v_user_two_id,
      p_local_day,
      v_candidate.overlap_starts_at,
      v_candidate.overlap_ends_at,
      'pending',
      timezone('utc', now()) + make_interval(mins => p_expires_in_minutes)
    )
    returning * into v_match;
  exception
    when unique_violation or check_violation or raise_exception then
      return null;
  end;

  return v_match;
end;
$$;

create or replace function private.try_match_after_availability_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.create_match_for_user(new.user_id, new.local_day, 15);
  return new;
end;
$$;

drop trigger if exists try_match_after_availability_change on public.availability_slots;

create trigger try_match_after_availability_change
after insert or update on public.availability_slots
for each row
execute function private.try_match_after_availability_change();

commit;
