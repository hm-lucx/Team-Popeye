# Catchup First Deploy Plan

Stand: `4. Juni 2026`

Dieser Plan ist bewusst provider-agnostisch. Er geht davon aus, dass ihr das Backend zuerst als **eine einzelne App-Instanz** deployt.

## Ziel fuer den ersten Deploy

- ein stabiles `staging` Backend
- eine gehostete `Postgres`-Datenbank
- genau **eine** laufende Backend-Instanz
- `CALL_PROVIDER=mock` fuer den ersten externen End-to-End-Test

Der Grund fuer eine einzelne Instanz:

- Rate Limits sind aktuell in-memory
- der Maintenance-Scheduler sollte vorerst nur einmal laufen

## Deployment-Artefakte

Bereits im Repo vorhanden:

- Startscript: `npm run start`
- Migrationsrunner: `npm run migrate`
- One-Off-Jobs: `npm run jobs:once`
- Dockerfile: [backend/Dockerfile](/Users/simon/Desktop/Popeye/Team-Popeye/backend/Dockerfile:1)
- Healthcheck: `GET /health`
- Staging-Env-Vorlage: [backend/.env.staging.example](/Users/simon/Desktop/Popeye/Team-Popeye/backend/.env.staging.example:1)
- Konkrete Staging-Checkliste: [docs/staging-setup-checklist.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/staging-setup-checklist.md:1)

## Phase 1: Staging vorbereiten

### 1. Datenbank

Ihr braucht:

- eine erreichbare `Postgres`-Instanz
- `DATABASE_URL`
- wenn der Anbieter SSL fordert:
  - `DATABASE_SSL_MODE=require`
  - oder notfalls `DATABASE_SSL_MODE=no-verify`

### 2. Backend-Env setzen

Minimum:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3001`
- `APP_BASE_URL=https://<backend-domain>`
- `DATABASE_URL=...`
- `DATABASE_SSL_MODE=require`
- `CORS_ORIGIN=https://<frontend-domain>`
- `JWT_ACCESS_SECRET=<lang und zufaellig>`
- `CALL_PROVIDER=mock`
- `ENABLE_SCHEDULED_JOBS=true`
- `MAINTENANCE_SWEEP_SECONDS=30`

Optional:

- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`

### 3. Container bauen

Aus `backend/`:

```bash
docker build -t catchup-backend .
```

## Phase 2: Datenbank initialisieren

Vor dem ersten App-Start:

```bash
npm run migrate
```

oder im Container-Kontext denselben Command als One-Off-Task laufen lassen.

Danach optional:

```bash
npm run jobs:once
```

## Phase 3: Backend starten

Start:

```bash
npm run start
```

Nach dem Start pruefen:

- `GET /health`
- Response sollte `ok: true` liefern
- `callProvider` sollte `mock` anzeigen
- `scheduledJobsEnabled` sollte eure Env widerspiegeln

## Phase 4: Frontend anhaengen

Das Frontend braucht mindestens:

- Backend-Base-URL
- `credentials: 'include'` fuer Refresh / Logout
- Bearer-Token-Handling fuer API-Calls

SSE:

- `/realtime/stream` mit Bearer-Token anbinden
- fuer Browser am besten ueber einen kleinen `fetch`-basierten SSE-Client

## Phase 5: Staging Smoke-Test mit 2 echten Geraeten

Auf staging durchspielen:

1. User A und B registrieren
2. Friend Request senden und annehmen
3. Availability setzen
4. Match entsteht
5. beide akzeptieren
6. Call ueber `mock`-Flow oeffnen
7. `joined` / `left` ausloesen
8. Match endet auf `completed`
9. `streaks/me` zeigt Fortschritt

## Phase 6: Erster externer MVP-Test

Wenn staging stabil ist:

- gleiche App-Konfiguration kopieren
- neue DB oder sauberes Schema verwenden
- erst dann `CALL_PROVIDER=daily` planen

## Wann `Daily` sinnvoll wird

Erst umstellen, wenn diese Punkte stabil sind:

- Frontend-Call-Screen fertig
- Match- und Call-Flow auf staging sauber
- Refresh / SSE / Retry-Strategie stehen

Dann braucht ihr zusaetzlich:

- `CALL_PROVIDER=daily`
- `DAILY_API_KEY`
- `DAILY_DOMAIN`

## Wichtige Betriebsregeln fuer den ersten Deploy

- vorerst nur eine Backend-Instanz
- Scheduler nur auf dieser einen Instanz aktiv
- bei mehreren Instanzen spaeter:
  - zentrales Rate Limit
  - nur ein Job-Runner
  - besseres Monitoring

## Schnellste sinnvolle Reihenfolge

1. Staging-DB anlegen
2. Env setzen
3. Migrationen laufen lassen
4. Backend deployen
5. Health pruefen
6. Frontend gegen staging haengen
7. 2-Geraete-Test
8. erst danach `Daily`
