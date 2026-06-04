create or replace function private.guard_friend_request_state_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if old.status <> 'pending' then
      raise exception 'only_pending_friend_requests_can_change';
    end if;

    if new.status not in ('accepted', 'declined', 'cancelled', 'expired') then
      raise exception 'invalid_friend_request_status_transition';
    end if;

    new.responded_at := coalesce(new.responded_at, timezone('utc', now()));
  elsif new.responded_at is distinct from old.responded_at then
    raise exception 'responded_at_is_managed_by_the_system';
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
