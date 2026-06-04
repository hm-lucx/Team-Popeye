# Backend Ressourcen

Dieses Dokument sammelt die wichtigsten Ressourcen, die wir fuer das Catchup-Backend direkt verwenden koennen.

## Bereits im Repository vorhanden

- [docs/backend-sprint-plan.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-sprint-plan.md:1)
- [docs/backend-architecture.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-architecture.md:1)
- [docs/backend-smoke-tests.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-smoke-tests.md:1)
- [supabase/migrations/20260604120000_backend_sprint1_init.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604120000_backend_sprint1_init.sql:1)
- [supabase/migrations/20260604143000_backend_sprint2_social_and_availability.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604143000_backend_sprint2_social_and_availability.sql:1)
- [supabase/migrations/20260604162000_backend_sprint3_matching_vendor_light.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604162000_backend_sprint3_matching_vendor_light.sql:1)
- [supabase/migrations/20260604174000_backend_sprint3_match_trigger.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604174000_backend_sprint3_match_trigger.sql:1)
- [supabase/migrations/20260604180000_supabase_realtime_bridge.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604180000_supabase_realtime_bridge.sql:1)
- [supabase/functions/friend-invites/index.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/friend-invites/index.ts:1)
- [docs/backend-portability.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-portability.md:1)
- [docs/frontend-realtime-handoff.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/frontend-realtime-handoff.md:1)

## Offizielle Ressourcen, die wir direkt nutzen sollten

### Supabase Database Functions

Gut fuer datennahe Write-Flows wie Availability-RPCs.
Supabase empfiehlt Database Functions fuer datenintensive Operationen direkt in der Datenbank.

Nutzen wir hier fuer:
- `upsert_my_availability_slot`
- `clear_my_availability_slot`
- `set_my_daily_status`
- `clear_my_daily_status`

Quelle
- https://supabase.com/docs/guides/database/functions

### Supabase Edge Functions mit Auth-Kontext

Gut fuer serverseitige Logik, die Nutzerkontext und kontrollierte Fremddaten-Zugriffe braucht.
Supabase zeigt offiziell, wie man den `Authorization` Header in die Function uebergibt, damit RLS im Nutzerkontext gilt.

Nutzen wir hier fuer:
- Invite-Code aufloesen
- Friend Request erstellen
- Friend Request annehmen, ablehnen, abbrechen

Quellen
- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/functions/auth-legacy-jwt

### Supabase Cron

Fuer spaetere Sprints wichtig, wenn offene Matches ablaufen oder periodisch nach passenden Freunden gesucht werden soll.

Nutzen wir spaeter fuer:
- Match-Sweeper
- Expiry-Jobs
- Missed-Call-Aufraeumlogik

Quelle
- https://supabase.com/docs/guides/cron

### Supabase Realtime

Fuer den Frontend-Handoff wichtig, damit neue Friend Requests oder Matches live angezeigt werden koennen.

Nutzen wir spaeter fuer:
- neue oder geaenderte Matches
- Updates auf `friend_requests`
- Live-Status im Match-Flow
- Frontend-Subscriptions auf `match_responses`

Quelle
- https://supabase.com/docs/guides/realtime/postgres-changes

### Daily REST API

Fuer spaetere Calls brauchen wir serverseitige Room-Erstellung und kurzlebige Meeting Tokens.

Nutzen wir spaeter fuer:
- private Rooms
- zeitlich begrenzte Join-Tokens

Quellen
- https://docs.daily.co/reference/rest-api/rooms/create-room
- https://docs.daily.co/reference/rest-api/meeting-tokens/create-meeting-token

## Lokale Verfuegbarkeit im aktuellen Workspace

Vorhanden
- `node`
- `npm`

Nicht vorhanden
- `supabase` CLI
- `psql`
- `docker`
- `deno`

Folge
- Ich kann Struktur, Migrationen und Edge-Function-Code sauber vorbereiten.
- Ich kann in diesem Workspace aktuell nicht lokal den Supabase-Stack starten oder Edge Functions wirklich ausfuehren.
- Der Fachkern bleibt trotzdem reviewbar, weil die zentrale Logik in SQL-Migrationen und Doku liegt.

## Was wir spaeter von dir brauchen werden

1. Supabase-Projektzugang oder Projekt-Ref, sobald wir Migrationen wirklich anwenden und deployen wollen.
2. Die Ziel-Frontend-URL fuer echte Invite-Links.
3. Spaeter fuer Sprint 4: Daily API Key und Daily-Domain.
