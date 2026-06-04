begin;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.guard_friend_request_state_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if old.status <> 'pending' then
      raise exception 'only pending friend requests can change state';
    end if;

    if new.status not in ('accepted', 'declined', 'cancelled', 'expired') then
      raise exception 'invalid friend request status transition';
    end if;

    new.responded_at := coalesce(new.responded_at, timezone('utc', now()));
  elsif new.responded_at is distinct from old.responded_at then
    raise exception 'responded_at is managed by the system';
  end if;

  return new;
end;
$$;

create trigger guard_friend_request_state_change
before update on public.friend_requests
for each row
execute function private.guard_friend_request_state_change();

create or replace function private.create_friendship_from_request()
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
    if new.requester_id::text <= new.addressee_id::text then
      v_user_one_id := new.requester_id;
      v_user_two_id := new.addressee_id;
    else
      v_user_one_id := new.addressee_id;
      v_user_two_id := new.requester_id;
    end if;

    insert into public.friendships (
      user_one_id,
      user_two_id,
      created_from_request_id
    )
    values (
      v_user_one_id,
      v_user_two_id,
      new.id
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger create_friendship_from_request
after update on public.friend_requests
for each row
execute function private.create_friendship_from_request();

create or replace function private.sync_availability_slot()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if (new.starts_at at time zone new.timezone)::date <> new.local_day then
    raise exception 'slot_start_must_match_local_day';
  end if;

  if (new.ends_at at time zone new.timezone)::date <> new.local_day then
    raise exception 'slot_end_must_match_local_day';
  end if;

  delete from public.daily_status
  where user_id = new.user_id
    and local_day = new.local_day;

  return new;
end;
$$;

create trigger sync_availability_slot
before insert or update on public.availability_slots
for each row
execute function private.sync_availability_slot();

create or replace function private.sync_daily_status()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  delete from public.availability_slots
  where user_id = new.user_id
    and local_day = new.local_day;

  return new;
end;
$$;

create trigger sync_daily_status
before insert or update on public.daily_status
for each row
execute function private.sync_daily_status();

create or replace function public.upsert_my_availability_slot(
  p_local_day date,
  p_timezone text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns public.availability_slots
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_slot public.availability_slots;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if trim(coalesce(p_timezone, '')) = '' then
    raise exception 'timezone_required';
  end if;

  if p_ends_at < p_starts_at + interval '5 minutes' then
    raise exception 'slot_must_be_at_least_five_minutes';
  end if;

  if (p_starts_at at time zone p_timezone)::date <> p_local_day then
    raise exception 'slot_start_must_match_local_day';
  end if;

  if (p_ends_at at time zone p_timezone)::date <> p_local_day then
    raise exception 'slot_end_must_match_local_day';
  end if;

  insert into public.availability_slots (
    user_id,
    local_day,
    timezone,
    starts_at,
    ends_at
  )
  values (
    v_user_id,
    p_local_day,
    p_timezone,
    p_starts_at,
    p_ends_at
  )
  on conflict (user_id, local_day)
  do update
  set
    timezone = excluded.timezone,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at
  returning * into v_slot;

  return v_slot;
end;
$$;

create or replace function public.clear_my_availability_slot(
  p_local_day date
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.availability_slots
  where user_id = v_user_id
    and local_day = p_local_day;

  return found;
end;
$$;

create or replace function public.set_my_daily_status(
  p_local_day date,
  p_status public.daily_status_code default 'unavailable',
  p_reason text default null
)
returns public.daily_status
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily_status public.daily_status;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.daily_status (
    user_id,
    local_day,
    status,
    reason
  )
  values (
    v_user_id,
    p_local_day,
    p_status,
    nullif(trim(coalesce(p_reason, '')), '')
  )
  on conflict (user_id, local_day)
  do update
  set
    status = excluded.status,
    reason = excluded.reason
  returning * into v_daily_status;

  return v_daily_status;
end;
$$;

create or replace function public.clear_my_daily_status(
  p_local_day date
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.daily_status
  where user_id = v_user_id
    and local_day = p_local_day;

  return found;
end;
$$;

revoke all on function public.upsert_my_availability_slot(date, text, timestamptz, timestamptz) from public;
revoke all on function public.clear_my_availability_slot(date) from public;
revoke all on function public.set_my_daily_status(date, public.daily_status_code, text) from public;
revoke all on function public.clear_my_daily_status(date) from public;

grant execute on function public.upsert_my_availability_slot(date, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.clear_my_availability_slot(date) to authenticated;
grant execute on function public.set_my_daily_status(date, public.daily_status_code, text) to authenticated;
grant execute on function public.clear_my_daily_status(date) to authenticated;

create policy friend_requests_insert_own_pending
on public.friend_requests
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and requester_id <> addressee_id
  and status = 'pending'
  and not exists (
    select 1
    from public.friendships f
    where (
      f.user_one_id = friend_requests.requester_id
      and f.user_two_id = friend_requests.addressee_id
    ) or (
      f.user_one_id = friend_requests.addressee_id
      and f.user_two_id = friend_requests.requester_id
    )
  )
);

create policy friend_requests_update_addressee_decision
on public.friend_requests
for update
to authenticated
using (
  auth.uid() = addressee_id
  and status = 'pending'
)
with check (
  auth.uid() = addressee_id
  and status in ('accepted', 'declined')
);

create policy friend_requests_update_requester_cancel
on public.friend_requests
for update
to authenticated
using (
  auth.uid() = requester_id
  and status = 'pending'
)
with check (
  auth.uid() = requester_id
  and status = 'cancelled'
);

commit;
