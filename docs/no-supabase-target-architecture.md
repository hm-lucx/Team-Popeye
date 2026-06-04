# Catchup Zielarchitektur ohne Supabase

Dies ist die jetzt festgezogene Richtung fuer euren unabhaengigen Backend-Track.

## Feste Entscheidungen

- Backend: `Fastify` mit `TypeScript`
- Datenbank: `Postgres`
- Datenzugriff: `node-postgres` plus eigene SQL-Migrationen
- Auth: `Email + Passwort`, `argon2`, kurze `JWT` Access Tokens, opaque Refresh Tokens im `httpOnly` Cookie
- Realtime: kleine `SSE`-Schicht fuer `friend_requests`, `matches`, `match_responses`
- Calls: eigener `CallProvider`-Adapter, zuerst `Daily`

## Warum diese Kombination

Sie gibt euch viel Kontrolle ueber Produktlogik und API, ohne dass ihr auch noch Datenbank-Engine, Kryptografie oder WebRTC von Null bauen muesst.

Der wichtigste Architekturpunkt ist:

- Produktlogik gehoert euch
- Infrastruktur bleibt austauschbar

## Was wir bewusst selbst bauen

- Auth-Flows
- API-Endpunkte
- Invite- und Friendship-Logik
- Availability- und Matching-Logik
- Match-Lifecycle
- Streak-Logik
- kleines Realtime-Layer

## Was wir bewusst nicht selbst von Null bauen

- Passwort-Hashing-Primitive
- Datenbank-Engine
- Video-/Call-Infrastruktur

## API- und Datenmodell-Prinzip

- Das Frontend spricht nur mit eurer HTTP-API.
- `Postgres` ist der System of Record.
- Fachregeln leben in Services und SQL-Guards, nicht im Frontend.
- Realtime ist ein Adapter, kein zweiter Business-Logic-Pfad.

## Sicherheitslinie

- Passwoerter werden mit `argon2` gehasht.
- Access Tokens bleiben kurzlebig.
- Refresh Tokens sind zufaellige opaque Werte und werden nur gehasht gespeichert.
- Refresh Tokens liegen in einem `httpOnly` Cookie.
- Autorisierung passiert im Backend, nicht in der Datenbank ueber Anbieter-Features.

## Realtime-Linie

Wir bauen kein grosses Chat- oder Multiplayer-System.

Realtime lohnt sich nur fuer:

- eingehende Freundschaftsanfragen
- neues Match
- Match wurde angenommen oder abgelehnt

Alles andere darf im MVP normal refetchen.

## Datenbank-Linie

Wir halten moeglichst viel Fachkern in portablem SQL:

- Status-Guards
- eindeutige Freundschaftspaare
- exklusive Tagesstatus-/Availability-Regeln
- Match-Invariants
- Match-Response-Synchronisierung

Das macht einen spaeteren Hosting-Wechsel deutlich leichter.

## Umsetzungsreihenfolge

1. Backend-Fundament und Auth
2. Social Graph und Availability API
3. Matching und Match-Responses
4. Call-Provider-Anbindung
5. Jobs, Streaks und Hardening

## Was ich als Naechstes von euch brauche

- eine Entscheidung, wo `Postgres` laufen soll
- spaeter eine `DATABASE_URL`
- spaeter `Daily`-Zugangsdaten, wenn wir die Calls anschliessen
