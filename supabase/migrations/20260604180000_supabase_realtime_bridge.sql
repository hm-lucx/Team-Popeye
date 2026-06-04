begin;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'friend_requests'
    ) then
      alter publication supabase_realtime add table public.friend_requests;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'matches'
    ) then
      alter publication supabase_realtime add table public.matches;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'match_responses'
    ) then
      alter publication supabase_realtime add table public.match_responses;
    end if;
  end if;
end
$$;

commit;
