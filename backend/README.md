# Catchup Backend

Eigenstaendiges Backend ohne Supabase.

## Zielbild

- eigenes `Fastify` API-Backend
- eigenes `Email + Passwort` Auth
- `Postgres` als Datenbank
- kleine `SSE`-Schicht fuer Friend- und Match-Events
- austauschbarer Call-Provider mit `mock` lokal und `Daily` spaeter
- leichte serverseitige Gamification mit Streaks und neutralen Skip-Tagen
- einfache Maintenance-Sweeps fuer `expired`, `missed` und spaete `completed`

## Aktueller Stand

Der lokale No-Supabase-Track deckt aktuell Sprint 1 bis Sprint 5 ab:

- Fastify-App-Grundgeruest
- Health-Route
- Auth-Endpunkte fuer `signup`, `login`, `refresh`, `me`, `logout`
- Friend-Request- und Friendship-Endpunkte
- Availability- und Daily-Status-Endpunkte
- Match-Liste, Match-Detail, Match-Response und manueller Match-Attempt
- Call-Session-Endpunkte fuer `join`, `event` und `read`
- Streak-Endpunkt fuer aktuellen Stand und Tagesstatus
- `mock`-Call-Provider fuer lokale Entwicklung
- `Daily`-Provider als austauschbare Integrationsschicht
- Postgres-Anbindung
- SQL-Migrationsrunner
- portierte Kernmigrationen ohne Supabase-Abhaengigkeit
- SSE-Transport als kleiner Realtime-Adapter
- kleine In-Memory-Rate-Limits fuer kritische Write-Pfade
- Maintenance-Job fuer Match-Expiry, Missed Calls und Streak-Fortschreibung
- lokaler End-to-End-Smoke-Test fuer den gesamten Match-zu-Call-Flow

## Lokaler Start

1. `cd backend`
2. `npm install`
3. `.env.example` nach `.env` kopieren und Werte setzen
4. Postgres bereitstellen und `DATABASE_URL` setzen
5. `npm run migrate`
6. `npm run dev`
7. optional: `npm run smoke:calls`
8. optional: `npm run smoke:maintenance`

## Lokale Verifikation

Erfolgreich lokal geprueft wurden:

- `npm run check`
- `npm run build`
- `npm run jobs:once`
- kompletter Flow mit zwei Test-Usern:
  - Signup
  - Friend Request
  - Friendship Accept
  - ueberlappende Availability
  - automatischer Match
  - beidseitiges Accept
  - Call-Join
  - `joined`- und `left`-Events
  - Match geht am Ende auf `completed`
- Maintenance-Flow:
  - `pending -> expired`
  - `accepted -> missed`, wenn niemand joint
  - `accepted -> completed`, wenn beide gejoint haben und der Sweep spaeter abschliesst
  - Streak bleibt ueber `skipped`-Tage erhalten

## Wichtige Entscheidungen

- kein ORM, sondern `node-postgres` plus SQL-Migrationen
- kurze `JWT` Access Tokens
- opaque Refresh Tokens in `httpOnly` Cookie
- Fachlogik bleibt moeglichst in SQL und Services
- Realtime bleibt bewusst klein und nur fuer Events mit echtem Mehrwert
- Jobs bleiben portabel und laufen als normale App-Sweeps statt plattformspezifischer Cron-Abhaengigkeit

## Was ich von euch spaeter brauche

- eine laufende Postgres-Instanz
- einen starken Wert fuer `JWT_ACCESS_SECRET`
- spaeter `Daily`-Zugangsdaten, wenn wir den echten Call-Provider aktivieren

## Weiterfuehrende Doku

- Frontend-Handoff: [docs/frontend-backend-handoff-final.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/frontend-backend-handoff-final.md:1)
- First Deploy Plan: [docs/backend-first-deploy-plan.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-first-deploy-plan.md:1)
- Launch Checklist: [docs/backend-launch-checklist.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-launch-checklist.md:1)
