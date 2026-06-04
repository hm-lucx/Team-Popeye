create or replace function private.apply_completed_match_to_streak(
  p_user_id uuid,
  p_completed_local_day date
)
returns public.streaks
language plpgsql
set search_path = public, private
as $$
declare
  v_streak public.streaks;
  v_new_current integer;
  v_can_continue boolean;
begin
  insert into public.streaks (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_streak
  from public.streaks
  where user_id = p_user_id
  for update;

  if v_streak.last_completed_local_day is not null
     and p_completed_local_day <= v_streak.last_completed_local_day then
    return v_streak;
  end if;

  if v_streak.last_completed_local_day is null then
    v_new_current := 1;
  else
    select not exists (
      select 1
      from generate_series(
        v_streak.last_completed_local_day + interval '1 day',
        p_completed_local_day - interval '1 day',
        interval '1 day'
      ) as d(day)
      where not exists (
        select 1
        from public.daily_status ds
        where ds.user_id = p_user_id
          and ds.local_day = d.day::date
          and ds.status in ('unavailable', 'skipped')
      )
    )
    into v_can_continue;

    if v_can_continue then
      v_new_current := v_streak.current_streak + 1;
    else
      v_new_current := 1;
    end if;
  end if;

  update public.streaks
  set
    current_streak = v_new_current,
    longest_streak = greatest(longest_streak, v_new_current),
    last_completed_local_day = p_completed_local_day
  where user_id = p_user_id
  returning *
  into v_streak;

  return v_streak;
end;
$$;

create or replace function private.sync_streaks_from_completed_match()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform private.apply_completed_match_to_streak(new.user_one_id, new.local_day);
    perform private.apply_completed_match_to_streak(new.user_two_id, new.local_day);
  end if;

  return new;
end;
$$;

create trigger sync_streaks_from_completed_match
after update on public.matches
for each row
execute function private.sync_streaks_from_completed_match();
