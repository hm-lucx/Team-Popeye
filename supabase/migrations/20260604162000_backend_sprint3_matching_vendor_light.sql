begin;

create or replace function private.lock_user_pair(
  p_user_a uuid,
  p_user_b uuid
)
returns void
language plpgsql
as $$
declare
  v_first uuid;
  v_second uuid;
begin
  if p_user_a::text <= p_user_b::text then
    v_first := p_user_a;
    v_second := p_user_b;
  else
    v_first := p_user_b;
    v_second := p_user_a;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_first::text));

  if v_second <> v_first then
    perform pg_advisory_xact_lock(hashtext(v_second::text));
  end if;
end;
$$;

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
        and m.status in ('pending', 'accepted')
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

create or replace function private.guard_match_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status not in ('accepted', 'declined', 'expired', 'cancelled') then
      raise exception 'invalid_match_status_transition';
    elsif old.status = 'accepted' and new.status not in ('completed', 'missed', 'cancelled') then
      raise exception 'invalid_match_status_transition';
    elsif old.status not in ('pending', 'accepted') then
      raise exception 'terminal_match_status_is_immutable';
    end if;

    if new.status = 'accepted' then
      new.accepted_at := coalesce(new.accepted_at, timezone('utc', now()));
      new.expires_at := null;
    elsif new.status = 'declined' then
      new.declined_at := coalesce(new.declined_at, timezone('utc', now()));
      new.expires_at := null;
    elsif new.status = 'cancelled' then
      new.cancelled_at := coalesce(new.cancelled_at, timezone('utc', now()));
      new.expires_at := null;
    elsif new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, timezone('utc', now()));
    elsif new.status = 'expired' then
      new.expires_at := coalesce(new.expires_at, timezone('utc', now()));
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_match_status_transition
before update on public.matches
for each row
execute function private.guard_match_status_transition();

create or replace function private.guard_match_response_update()
returns trigger
language plpgsql
as $$
begin
  if new.match_id <> old.match_id or new.user_id <> old.user_id then
    raise exception 'match_response_identity_is_immutable';
  end if;

  if new.response is distinct from old.response then
    if old.response <> 'pending' then
      raise exception 'only_pending_match_responses_can_change';
    end if;

    if new.response not in ('accepted', 'declined') then
      raise exception 'invalid_match_response_transition';
    end if;

    new.responded_at := coalesce(new.responded_at, timezone('utc', now()));
  elsif new.responded_at is distinct from old.responded_at then
    raise exception 'responded_at_is_managed_by_the_system';
  end if;

  return new;
end;
$$;

create trigger guard_match_response_update
before update on public.match_responses
for each row
execute function private.guard_match_response_update();

create or replace function private.refresh_match_from_responses(
  p_match_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_match public.matches;
  v_accepted_count integer;
  v_declined_count integer;
  v_pending_count integer;
begin
  select *
  into v_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    return null;
  end if;

  select
    count(*) filter (where response = 'accepted'),
    count(*) filter (where response = 'declined'),
    count(*) filter (where response = 'pending')
  into
    v_accepted_count,
    v_declined_count,
    v_pending_count
  from public.match_responses
  where match_id = p_match_id;

  if v_match.status = 'pending' then
    if v_declined_count > 0 then
      update public.matches
      set status = 'declined'
      where id = p_match_id
      returning * into v_match;
    elsif v_accepted_count = 2 and v_pending_count = 0 then
      update public.matches
      set status = 'accepted'
      where id = p_match_id
      returning * into v_match;
    end if;
  end if;

  return v_match;
end;
$$;

create or replace function private.sync_match_status_from_response()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.refresh_match_from_responses(new.match_id);
  return new;
end;
$$;

create trigger sync_match_status_from_response
after update on public.match_responses
for each row
execute function private.sync_match_status_from_response();

create or replace function private.touch_friendship_last_matched()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_user_one_id uuid;
  v_user_two_id uuid;
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    if new.user_one_id::text <= new.user_two_id::text then
      v_user_one_id := new.user_one_id;
      v_user_two_id := new.user_two_id;
    else
      v_user_one_id := new.user_two_id;
      v_user_two_id := new.user_one_id;
    end if;

    update public.friendships
    set last_matched_at = coalesce(new.accepted_at, timezone('utc', now()))
    where user_one_id = v_user_one_id
      and user_two_id = v_user_two_id;
  end if;

  return new;
end;
$$;

create trigger touch_friendship_last_matched
after update on public.matches
for each row
execute function private.touch_friendship_last_matched();

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

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

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

create or replace function private.respond_to_match(
  p_user_id uuid,
  p_match_id uuid,
  p_response public.match_response_status
)
returns public.matches
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_match public.matches;
begin
  if p_user_id is null then
    raise exception 'user_id_required';
  end if;

  if p_response not in ('accepted', 'declined') then
    raise exception 'invalid_match_response';
  end if;

  select *
  into v_match
  from public.matches
  where id = p_match_id
    and (user_one_id = p_user_id or user_two_id = p_user_id)
  for update;

  if not found then
    raise exception 'match_not_found';
  end if;

  if v_match.status <> 'pending' then
    raise exception 'match_not_pending';
  end if;

  if v_match.expires_at is not null and v_match.expires_at <= timezone('utc', now()) then
    update public.matches
    set status = 'expired'
    where id = p_match_id
    returning * into v_match;

    return v_match;
  end if;

  update public.match_responses
  set response = p_response
  where match_id = p_match_id
    and user_id = p_user_id;

  if not found then
    raise exception 'match_response_not_found';
  end if;

  select *
  into v_match
  from public.matches
  where id = p_match_id;

  return v_match;
end;
$$;

create or replace function public.try_create_match_for_me(
  p_local_day date,
  p_expires_in_minutes integer default 15
)
returns public.matches
language plpgsql
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return private.create_match_for_user(
    v_user_id,
    p_local_day,
    p_expires_in_minutes
  );
end;
$$;

create or replace function public.respond_to_my_match(
  p_match_id uuid,
  p_response public.match_response_status
)
returns public.matches
language plpgsql
set search_path = public, private
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return private.respond_to_match(v_user_id, p_match_id, p_response);
end;
$$;

create or replace function public.expire_pending_matches(
  p_now timestamptz default timezone('utc', now())
)
returns setof public.matches
language plpgsql
set search_path = public
as $$
begin
  return query
  update public.matches
  set status = 'expired',
      expires_at = coalesce(expires_at, p_now)
  where status = 'pending'
    and expires_at is not null
    and expires_at <= p_now
  returning *;
end;
$$;

revoke all on function public.try_create_match_for_me(date, integer) from public;
revoke all on function public.respond_to_my_match(uuid, public.match_response_status) from public;
revoke all on function public.expire_pending_matches(timestamptz) from public;

grant execute on function public.try_create_match_for_me(date, integer) to authenticated;
grant execute on function public.respond_to_my_match(uuid, public.match_response_status) to authenticated;

commit;
