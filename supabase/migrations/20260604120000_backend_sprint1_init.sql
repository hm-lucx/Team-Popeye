begin;

create extension if not exists pgcrypto;

create type public.friend_request_status as enum (
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'expired'
);

create type public.daily_status_code as enum (
  'unavailable',
  'skipped'
);

create type public.match_status as enum (
  'pending',
  'accepted',
  'declined',
  'expired',
  'completed',
  'cancelled',
  'missed'
);

create type public.match_response_status as enum (
  'pending',
  'accepted',
  'declined'
);

create type public.call_session_status as enum (
  'scheduled',
  'active',
  'ended',
  'failed',
  'cancelled'
);

create type public.call_participant_status as enum (
  'invited',
  'token_issued',
  'joined',
  'left',
  'missed'
);

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 50),
  avatar_url text,
  timezone text not null default 'UTC' check (char_length(trim(timezone)) between 1 and 64),
  invite_code text not null unique check (char_length(invite_code) between 6 and 16),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.tg_set_updated_at();

create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select upper(encode(gen_random_bytes(4), 'hex'));
$$;

create or replace function public.generate_unique_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := public.generate_invite_code();
    exit when not exists (
      select 1
      from public.profiles p
      where p.invite_code = v_code
    );
  end loop;

  return v_code;
end;
$$;

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  invite_code_snapshot text,
  message text,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (requester_id <> addressee_id)
);

create unique index friend_requests_unique_pending_pair_idx
on public.friend_requests (
  least(requester_id::text, addressee_id::text),
  greatest(requester_id::text, addressee_id::text)
)
where status = 'pending';

create index friend_requests_requester_status_idx
on public.friend_requests (requester_id, status, created_at desc);

create index friend_requests_addressee_status_idx
on public.friend_requests (addressee_id, status, created_at desc);

create trigger set_friend_requests_updated_at
before update on public.friend_requests
for each row
execute function public.tg_set_updated_at();

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references public.profiles (id) on delete cascade,
  user_two_id uuid not null references public.profiles (id) on delete cascade,
  created_from_request_id uuid unique references public.friend_requests (id) on delete set null,
  last_matched_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (user_one_id <> user_two_id)
);

create unique index friendships_unique_pair_idx
on public.friendships (
  least(user_one_id::text, user_two_id::text),
  greatest(user_one_id::text, user_two_id::text)
);

create index friendships_user_one_idx
on public.friendships (user_one_id, created_at desc);

create index friendships_user_two_idx
on public.friendships (user_two_id, created_at desc);

create trigger set_friendships_updated_at
before update on public.friendships
for each row
execute function public.tg_set_updated_at();

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_day date not null,
  timezone text not null check (char_length(trim(timezone)) between 1 and 64),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at),
  check (ends_at >= starts_at + interval '5 minutes')
);

create unique index availability_slots_user_day_idx
on public.availability_slots (user_id, local_day);

create index availability_slots_local_day_idx
on public.availability_slots (local_day, starts_at);

create trigger set_availability_slots_updated_at
before update on public.availability_slots
for each row
execute function public.tg_set_updated_at();

create table public.daily_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  local_day date not null,
  status public.daily_status_code not null,
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index daily_status_user_day_idx
on public.daily_status (user_id, local_day);

create index daily_status_day_status_idx
on public.daily_status (local_day, status);

create trigger set_daily_status_updated_at
before update on public.daily_status
for each row
execute function public.tg_set_updated_at();

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references public.profiles (id) on delete cascade,
  user_two_id uuid not null references public.profiles (id) on delete cascade,
  local_day date not null,
  overlap_starts_at timestamptz not null,
  overlap_ends_at timestamptz not null,
  status public.match_status not null default 'pending',
  expires_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (user_one_id <> user_two_id),
  check (overlap_ends_at > overlap_starts_at),
  check (overlap_ends_at >= overlap_starts_at + interval '5 minutes')
);

create unique index matches_unique_active_pair_day_idx
on public.matches (
  least(user_one_id::text, user_two_id::text),
  greatest(user_one_id::text, user_two_id::text),
  local_day
)
where status in ('pending', 'accepted');

create index matches_user_one_status_idx
on public.matches (user_one_id, local_day, status);

create index matches_user_two_status_idx
on public.matches (user_two_id, local_day, status);

create index matches_status_expires_at_idx
on public.matches (status, expires_at);

create trigger set_matches_updated_at
before update on public.matches
for each row
execute function public.tg_set_updated_at();

create table public.match_responses (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  response public.match_response_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, user_id)
);

create index match_responses_user_idx
on public.match_responses (user_id, response, created_at desc);

create trigger set_match_responses_updated_at
before update on public.match_responses
for each row
execute function public.tg_set_updated_at();

create table public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches (id) on delete cascade,
  provider text not null check (char_length(trim(provider)) between 2 and 50),
  provider_room_id text,
  room_url text,
  metadata jsonb not null default '{}'::jsonb,
  status public.call_session_status not null default 'scheduled',
  room_expires_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index call_sessions_status_idx
on public.call_sessions (status, created_at desc);

create trigger set_call_sessions_updated_at
before update on public.call_sessions
for each row
execute function public.tg_set_updated_at();

create table public.call_participants (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.call_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.call_participant_status not null default 'invited',
  provider_participant_id text,
  token_expires_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (call_session_id, user_id)
);

create index call_participants_user_idx
on public.call_participants (user_id, status, created_at desc);

create trigger set_call_participants_updated_at
before update on public.call_participants
for each row
execute function public.tg_set_updated_at();

create table public.streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0 and longest_streak >= current_streak),
  last_completed_local_day date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_streaks_updated_at
before update on public.streaks
for each row
execute function public.tg_set_updated_at();

create or replace function public.enforce_match_invariants()
returns trigger
language plpgsql
as $$
begin
  if new.user_one_id = new.user_two_id then
    raise exception 'users in a match must be different';
  end if;

  if new.overlap_ends_at < new.overlap_starts_at + interval '5 minutes' then
    raise exception 'match overlap must be at least 5 minutes';
  end if;

  if new.status in ('pending', 'accepted') then
    if exists (
      select 1
      from public.matches m
      where m.id <> new.id
        and m.local_day = new.local_day
        and m.status in ('pending', 'accepted')
        and (
          new.user_one_id = m.user_one_id
          or new.user_one_id = m.user_two_id
          or new.user_two_id = m.user_one_id
          or new.user_two_id = m.user_two_id
        )
    ) then
      raise exception 'a user can only have one active match per local day';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_match_invariants
before insert or update on public.matches
for each row
execute function public.enforce_match_invariants();

create or replace function public.create_default_match_responses()
returns trigger
language plpgsql
as $$
begin
  insert into public.match_responses (match_id, user_id)
  values
    (new.id, new.user_one_id),
    (new.id, new.user_two_id)
  on conflict (match_id, user_id) do nothing;

  return new;
end;
$$;

create trigger create_default_match_responses
after insert on public.matches
for each row
execute function public.create_default_match_responses();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_avatar_url text;
  v_timezone text;
  v_fallback_name text;
begin
  v_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_avatar_url := nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '');
  v_timezone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'timezone', '')), '');
  v_fallback_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');

  insert into public.profiles (id, display_name, avatar_url, timezone, invite_code)
  values (
    new.id,
    coalesce(v_display_name, v_fallback_name, 'friend'),
    v_avatar_url,
    coalesce(v_timezone, 'UTC'),
    public.generate_unique_invite_code()
  )
  on conflict (id) do nothing;

  insert into public.streaks (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name, avatar_url, timezone, invite_code)
select
  u.id,
  coalesce(
    nullif(trim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'friend'
  ),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url', '')), ''),
  coalesce(nullif(trim(coalesce(u.raw_user_meta_data ->> 'timezone', '')), ''), 'UTC'),
  public.generate_unique_invite_code()
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);

insert into public.streaks (user_id)
select p.id
from public.profiles p
where not exists (
  select 1
  from public.streaks s
  where s.user_id = p.id
);

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.availability_slots enable row level security;
alter table public.daily_status enable row level security;
alter table public.matches enable row level security;
alter table public.match_responses enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_participants enable row level security;
alter table public.streaks enable row level security;

create policy profiles_select_self_or_friend
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.friendships f
    where (
      f.user_one_id = auth.uid()
      and f.user_two_id = profiles.id
    ) or (
      f.user_two_id = auth.uid()
      and f.user_one_id = profiles.id
    )
  )
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy friend_requests_select_involved_users
on public.friend_requests
for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy availability_slots_select_own
on public.availability_slots
for select
to authenticated
using (auth.uid() = user_id);

create policy availability_slots_insert_own
on public.availability_slots
for insert
to authenticated
with check (auth.uid() = user_id);

create policy availability_slots_update_own
on public.availability_slots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy availability_slots_delete_own
on public.availability_slots
for delete
to authenticated
using (auth.uid() = user_id);

create policy daily_status_select_own
on public.daily_status
for select
to authenticated
using (auth.uid() = user_id);

create policy daily_status_insert_own
on public.daily_status
for insert
to authenticated
with check (auth.uid() = user_id);

create policy daily_status_update_own
on public.daily_status
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy daily_status_delete_own
on public.daily_status
for delete
to authenticated
using (auth.uid() = user_id);

create policy friendships_select_involved_users
on public.friendships
for select
to authenticated
using (auth.uid() = user_one_id or auth.uid() = user_two_id);

create policy matches_select_involved_users
on public.matches
for select
to authenticated
using (auth.uid() = user_one_id or auth.uid() = user_two_id);

create policy match_responses_select_match_participants
on public.match_responses
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.matches m
    where m.id = match_responses.match_id
      and (m.user_one_id = auth.uid() or m.user_two_id = auth.uid())
  )
);

create policy call_sessions_select_match_participants
on public.call_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = call_sessions.match_id
      and (m.user_one_id = auth.uid() or m.user_two_id = auth.uid())
  )
);

create policy call_participants_select_call_participants
on public.call_participants
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.call_sessions cs
    join public.matches m on m.id = cs.match_id
    where cs.id = call_participants.call_session_id
      and (m.user_one_id = auth.uid() or m.user_two_id = auth.uid())
  )
);

create policy streaks_select_own
on public.streaks
for select
to authenticated
using (auth.uid() = user_id);

commit;
