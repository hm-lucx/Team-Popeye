# Catchup Staging Setup Checklist

Stand: `4. Juni 2026`

Dieses Dokument ist die konkrete Ausfuehrungsversion fuer euren ersten `staging`-Deploy.

## 1. Datei vorbereiten

Nehmt als Ausgangspunkt:

- [backend/.env.staging.example](/Users/simon/Desktop/Popeye/Team-Popeye/backend/.env.staging.example:1)

Kopiert die Werte in die Env-Verwaltung eures Hosters oder in eine lokale `staging`-Datei.

## 2. Werte ausfuellen

Diese Werte muessen vor dem ersten Deploy gesetzt werden:

- `APP_BASE_URL`
  Beispiel: `https://api-staging.catchup.example`
- `DATABASE_URL`
  Eure gehostete Postgres-URL
- `DATABASE_SSL_MODE`
  Meist `require`
- `CORS_ORIGIN`
  Beispiel: `https://staging.catchup.example`
- `JWT_ACCESS_SECRET`
  langer zufaelliger Wert

Diese Werte koennen erstmal so bleiben:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3001`
- `JWT_ISSUER=catchup-api`
- `JWT_AUDIENCE=catchup-app`
- `ACCESS_TOKEN_TTL_MINUTES=15`
- `REFRESH_TOKEN_TTL_DAYS=30`
- `SSE_HEARTBEAT_SECONDS=25`
- `ENABLE_SCHEDULED_JOBS=true`
- `MAINTENANCE_SWEEP_SECONDS=30`
- `CALL_PROVIDER=mock`
- `CALL_ROOM_TTL_MINUTES=90`
- `CALL_JOIN_TOKEN_TTL_MINUTES=30`

Diese Werte bleiben leer, bis ihr spaeter auf echte Calls umstellt:

- `DAILY_API_KEY`
- `DAILY_DOMAIN`

## 3. Reihenfolge fuer den ersten Staging-Deploy

1. Gehostete `Postgres`-Datenbank anlegen.
2. Alle Env-Werte aus `backend/.env.staging.example` in eure Deploy-Umgebung uebernehmen.
3. Migrationen ausfuehren:
   - `npm run migrate`
4. Optional direkt danach:
   - `npm run jobs:once`
5. Backend starten:
   - `npm run start`
6. `GET /health` pruefen.
7. Frontend anhaengen.
8. Zwei echte Test-User auf zwei Geraeten durch den Kernflow schicken.

## 4. Was bei `/health` gut aussehen sollte

Erwartet werden mindestens:

- `ok: true`
- `service: catchup-backend`
- `callProvider: mock`
- `scheduledJobsEnabled: true`

## 5. Minimaler Staging-Smoke-Test

Mit zwei echten Test-Usern pruefen:

1. Signup
2. Friend Request senden
3. Friend Request annehmen
4. Availability setzen
5. Match entsteht
6. beide akzeptieren
7. Call-Screen ueber `mock` oeffnen
8. `joined` und `left` durchlaufen
9. Match geht auf `completed`
10. `streaks/me` zeigt Fortschritt

## 6. Erst wenn das stabil ist

Dann koennt ihr spaeter umstellen auf:

- `CALL_PROVIDER=daily`
- `DAILY_API_KEY=<...>`
- `DAILY_DOMAIN=<...>`

## 7. Wichtige Betriebsregel

Fuer den ersten Staging-Deploy nur:

- `1` Backend-Instanz

Grund:

- Rate Limits sind aktuell in-memory
- der Maintenance-Sweep soll nur einmal parallel laufen
