create or replace function private.find_match_candidate_for_user(
  p_user_id uuid,
  p_local_day date,
  p_candidate_user_id uuid default null
)
returns table (
  friendship_id uuid,
  candidate_user_id uuid,
  overlap_starts_at timestamptz,
  overlap_ends_at timestamptz,
  last_matched_at timestamptz
)
language sql
stable
set search_path = public
as $$
  with my_slot as (
    select
      s.user_id,
      s.local_day,
      s.starts_at,
      s.ends_at
    from public.availability_slots s
    where s.user_id = p_user_id
      and s.local_day = p_local_day
  )
  select
    f.id as friendship_id,
    fs.user_id as candidate_user_id,
    greatest(ms.starts_at, fs.starts_at) as overlap_starts_at,
    least(ms.ends_at, fs.ends_at) as overlap_ends_at,
    f.last_matched_at
  from public.friendships f
  join my_slot ms on true
  join public.availability_slots fs
    on fs.local_day = ms.local_day
   and fs.user_id = case
     when f.user_one_id = p_user_id then f.user_two_id
     else f.user_one_id
   end
  where (f.user_one_id = p_user_id or f.user_two_id = p_user_id)
    and (p_candidate_user_id is null or fs.user_id = p_candidate_user_id)
    and not exists (
      select 1
      from public.daily_status ds
      where ds.user_id = p_user_id
        and ds.local_day = p_local_day
    )
    and not exists (
      select 1
      from public.daily_status ds
      where ds.user_id = fs.user_id
        and ds.local_day = p_local_day
    )
    and not exists (
      select 1
      from public.matches m
      where m.local_day = p_local_day
        and (
          m.status = 'accepted'
          or (
            m.status = 'pending'
            and (m.expires_at is null or m.expires_at > timezone('utc', now()))
          )
        )
        and (
          m.user_one_id = p_user_id
          or m.user_two_id = p_user_id
          or m.user_one_id = fs.user_id
          or m.user_two_id = fs.user_id
        )
    )
    and least(ms.ends_at, fs.ends_at) >= greatest(ms.starts_at, fs.starts_at) + interval '5 minutes'
  order by
    case
      when f.last_matched_at is null
        or f.last_matched_at < timezone('utc', now()) - interval '7 days'
      then 0
      else 1
    end,
    random()
  limit 1;
$$;

create or replace function private.create_match_for_user(
  p_user_id uuid,
  p_local_day date,
  p_expires_in_minutes integer default 15
)
returns public.matches
language plpgsql
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

  perform public.expire_pending_matches();

  select *
  into v_candidate
  from private.find_match_candidate_for_user(p_user_id, p_local_day, null);

  if not found then
    return null;
  end if;

  perform private.lock_user_pair(p_user_id, v_candidate.candidate_user_id);

  perform public.expire_pending_matches();

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
