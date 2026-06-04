# Catchup Backend

Eigenstaendiges Backend ohne Supabase.

## Zielbild

- eigenes `Fastify` API-Backend
- eigenes `Email + Passwort` Auth
- `Postgres` als Datenbank
- kleine `SSE`-Schicht fuer Friend- und Match-Events
- austauschbarer Call-Provider mit `mock` lokal und `Daily` spaeter

## Aktueller Stand

Der lokale No-Supabase-Track deckt aktuell Sprint 1 bis Sprint 4 ab:

- Fastify-App-Grundgeruest
- Health-Route
- Auth-Endpunkte fuer `signup`, `login`, `refresh`, `me`, `logout`
- Friend-Request- und Friendship-Endpunkte
- Availability- und Daily-Status-Endpunkte
- Match-Liste, Match-Detail, Match-Response und manueller Match-Attempt
- Call-Session-Endpunkte fuer `join`, `event` und `read`
- `mock`-Call-Provider fuer lokale Entwicklung
- `Daily`-Provider als austauschbare Integrationsschicht
- Postgres-Anbindung
- SQL-Migrationsrunner
- portierte Kernmigrationen ohne Supabase-Abhaengigkeit
- SSE-Transport als kleiner Realtime-Adapter
- lokaler End-to-End-Smoke-Test fuer den gesamten Match-zu-Call-Flow

## Lokaler Start

1. `cd backend`
2. `npm install`
3. `.env.example` nach `.env` kopieren und Werte setzen
4. Postgres bereitstellen und `DATABASE_URL` setzen
5. `npm run migrate`
6. `npm run dev`
7. optional: `npm run smoke:calls`

## Lokale Verifikation

Erfolgreich lokal geprueft wurden:

- `npm run check`
- `npm run build`
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

## Wichtige Entscheidungen

- kein ORM, sondern `node-postgres` plus SQL-Migrationen
- kurze `JWT` Access Tokens
- opaque Refresh Tokens in `httpOnly` Cookie
- Fachlogik bleibt moeglichst in SQL und Services
- Realtime bleibt bewusst klein und nur fuer Events mit echtem Mehrwert

## Was ich von euch spaeter brauche

- eine laufende Postgres-Instanz
- einen starken Wert fuer `JWT_ACCESS_SECRET`
- spaeter `Daily`-Zugangsdaten, wenn wir den echten Call-Provider aktivieren
