# Catchup Backend Launch Checklist

Stand: `4. Juni 2026`

## Vor dem ersten externen Test

- `npm run check`
- `npm run build`
- `npm run migrate`
- `npm run smoke:calls`
- `npm run smoke:maintenance`

## Env Vars

- `DATABASE_URL`
- `DATABASE_SSL_MODE`
- `JWT_ACCESS_SECRET`
- `CORS_ORIGIN`
- `CALL_PROVIDER`
- optional: `DAILY_API_KEY`
- optional: `DAILY_DOMAIN`
- optional: `ENABLE_SCHEDULED_JOBS`
- optional: `MAINTENANCE_SWEEP_SECONDS`

## Datenbank

- lokale oder gehostete `Postgres`-Instanz ist erreichbar
- Migrationen `0001` bis `0005` sind angewendet
- `users`, `profiles`, `friend_requests`, `friendships`, `availability_slots`, `daily_status`, `matches`, `match_responses`, `call_sessions`, `call_participants`, `streaks` existieren
- falls der Host SSL verlangt, ist `DATABASE_SSL_MODE=require` oder `no-verify` gesetzt

## Call-Provider

- lokal: `CALL_PROVIDER=mock`
- spaeter echt: `CALL_PROVIDER=daily`
- bei `daily` muessen API-Key und Domain gesetzt sein

## Realtime

- Frontend lauscht auf `/realtime/stream`
- fuer Browser wird ein `fetch`-basierter SSE-Client genutzt, damit `Authorization` mitsendet
- Frontend refetcht bei:
  - `friend_requests.changed`
  - `matches.changed`
  - `calls.changed`
  - `streaks.changed`

## Erste Deploy-Topologie

- vorerst nur `1` Backend-Instanz
- Scheduler nur auf dieser Instanz aktiv
- erst spaeter auf Multi-Instance gehen

## Bekannte Restthemen vor echtem Launch

- `Daily` noch nicht live gegen echte Credentials verifiziert
- Rate Limits sind aktuell in-memory und nicht multi-instance-fest
- `npm install` meldet derzeit `2 critical vulnerabilities`
- zentrales Monitoring und Error-Tracking fehlen noch
