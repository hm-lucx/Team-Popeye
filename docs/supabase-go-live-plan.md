# Catchup Inbetriebnahme-Plan

Dieses Dokument beschreibt den naechsten sinnvollen Weg vom aktuellen Repo-Stand zu einem testbaren Backend in einem echten Supabase-Projekt.

Ziel:

- SQL-Schema live bringen
- Edge Function deployen
- Kernfluesse mit 2 Test-Usern pruefen
- Frontend-Integration ermoeglichen

## Kurzfassung

Empfohlene Reihenfolge:

1. Supabase-Projekt im Dashboard anlegen
2. Kernmigrationen im SQL Editor ausfuehren
3. Realtime-Migration optional aktivieren
4. Edge Function `friend-invites` im Dashboard deployen
5. Zwei Test-User anlegen
6. Smoke Tests fuer Signup, Invite, Availability, Matching und Realtime durchgehen
7. Erst danach Frontend fest gegen das echte Backend anschliessen

## Phase 1: Projekt anlegen

Ziel

Ein leeres, echtes Supabase-Projekt als Zielumgebung haben.

Was zu tun ist

1. Im Supabase Dashboard ein neues Projekt anlegen.
2. Projekt-URL notieren.
3. Publishable Key spaeter fuer das Frontend bereithalten.

Ergebnis

- Supabase Auth, Database und Edge Functions sind verfuegbar.

Was ich dafuer von dir brauche

- nur die Info, dass das Projekt angelegt wurde
- optional die Projekt-URL, wenn ich dich genauer durch das Dashboard lotsen soll

## Phase 2: Kernmigrationen einspielen

Ziel

Das komplette Datenmodell und die Kernlogik live in die Datenbank bringen.

Reihenfolge im SQL Editor

1. [20260604120000_backend_sprint1_init.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604120000_backend_sprint1_init.sql:1)
2. [20260604143000_backend_sprint2_social_and_availability.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604143000_backend_sprint2_social_and_availability.sql:1)
3. [20260604162000_backend_sprint3_matching_vendor_light.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604162000_backend_sprint3_matching_vendor_light.sql:1)
4. [20260604174000_backend_sprint3_match_trigger.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604174000_backend_sprint3_match_trigger.sql:1)

Optional danach

5. [20260604180000_supabase_realtime_bridge.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604180000_supabase_realtime_bridge.sql:1)

Worauf achten

- jede Datei einzeln ausfuehren
- immer erst die vorherige erfolgreich abschliessen
- Fehler direkt notieren oder screenshotten

Ergebnis

- Tabellen, Trigger, RLS, RPCs und Match-Logik sind live

Was ich dafuer von dir brauche

- falls eine Query fehlschlaegt: die exakte Fehlermeldung

## Phase 3: Edge Function deployen

Ziel

Den Invite-Code-Flow serverseitig verfuegbar machen.

Was zu tun ist

1. Im Dashboard `Edge Functions` oeffnen
2. `Deploy a new function`
3. Function `friend-invites` anlegen
4. Code aus [friend-invites/index.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/friend-invites/index.ts:1) uebernehmen
5. Die Shared-Helfer logisch mit uebernehmen:
   [cors.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/_shared/cors.ts:1),
   [http.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/_shared/http.ts:1),
   [supabase.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/_shared/supabase.ts:1)
6. Function deployen

Worauf achten

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` muessen in der Function-Umgebung verfuegbar sein
- wenn das Dashboard diese Standard-Variablen bereitstellt, reicht das

Ergebnis

- Friend Requests koennen ueber Invite-Code erstellt und beantwortet werden

Was ich dafuer von dir brauche

- nur bei Problemen: Screenshot oder Copy-Paste des Function-Fehlers

## Phase 4: Zwei Test-User anlegen

Ziel

Mit echten Accounts testen, ob die Kernfluesse zusammenpassen.

Empfehlung

Zwei Testnutzer anlegen, zum Beispiel:

- `alice+catchup@...`
- `bob+catchup@...`

Zu pruefen

1. Beide koennen sich registrieren
2. `profiles` wird automatisch erzeugt
3. `streaks` wird automatisch erzeugt
4. jeder User hat einen `invite_code`

Ergebnis

- Auth und Profil-Bootstrap sind bestaetigt

## Phase 5: Friend-Request-Flow testen

Ziel

Validieren, dass der Social Graph sauber funktioniert.

Testablauf

1. User A liest seinen `invite_code`
2. User B sendet ueber `friend-invites` eine Anfrage
3. User A sieht die Anfrage
4. User A akzeptiert die Anfrage
5. `friendships` enthaelt danach genau einen Eintrag

Negativtests

1. denselben Code noch einmal verwenden
2. sich selbst adden
3. bereits bestaetigte Freundschaft erneut anlegen

Ergebnis

- Invite-Flow ist funktional und gegen einfache Fehlpfade abgesichert

## Phase 6: Availability und Match-Trigger testen

Ziel

Validieren, dass aus passenden Zeitslots automatisch ein Match entsteht.

Testablauf

1. Beide Nutzer sind bestaetigte Freunde
2. User A setzt einen Slot fuer heute
3. Es entsteht noch kein Match, wenn User B keinen Slot hat
4. User B setzt einen ueberschneidenden Slot fuer heute
5. Es entsteht automatisch ein `pending` Match
6. In `match_responses` existieren zwei Eintraege

Negativtests

1. kein Ueberschneidungsfenster
2. Slot unter 5 Minuten
3. Nutzer hat `daily_status = unavailable`
4. Nutzer hat bereits ein aktives Match fuer heute

Ergebnis

- automatischer Match-Trigger funktioniert

## Phase 7: Match-Response-Flow testen

Ziel

Validieren, dass Match-Statuswechsel korrekt laufen.

Testablauf

1. User A akzeptiert
2. Match bleibt `pending`, solange User B noch nicht reagiert hat
3. User B akzeptiert
4. Match springt auf `accepted`

Alternativ

1. einer lehnt ab
2. Match springt auf `declined`

Zusatztest

1. `expires_at` kuenstlich kurz setzen oder abwarten
2. pruefen, ob `expired` korrekt behandelt wird

Ergebnis

- Match-Lebenszyklus stimmt

## Phase 8: Realtime optional testen

Ziel

Live-Updates im Frontend oder Testclient bestaetigen.

Vorbedingung

- Realtime-Migration wurde ausgefuehrt

Zu pruefen

1. Friend Request erzeugt Event
2. neues Match erzeugt Event
3. Match-Response erzeugt Event

Wenn Realtime noch aus ist

- kein Problem
- Frontend soll nach Writes zunaechst refetchen

## Phase 9: Frontend anschliessen

Ziel

Dein Freund kann jetzt gegen echte, stabile Backend-Contracts bauen.

Relevante Doku

- [backend-contracts-sprint2.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-contracts-sprint2.md:1)
- [backend-contracts-sprint3.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-contracts-sprint3.md:1)
- [frontend-realtime-handoff.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/frontend-realtime-handoff.md:1)

Empfehlung fuer das Frontend

1. zuerst Auth + Profil + Friend Requests
2. dann Availability + Daily Status
3. dann Match-Ansicht
4. danach Realtime

## Reihenfolge fuer euch als Team

Tag 1

1. Projekt anlegen
2. Migrationen ausfuehren
3. Edge Function deployen

Tag 2

1. Test-User anlegen
2. Smoke Tests Friend Requests
3. Smoke Tests Availability und Matching

Tag 3

1. Frontend gegen echte Daten anschliessen
2. Realtime optional aktivieren
3. erste Ende-zu-Ende-Demo

## Was gut waere, wenn du es mir dann schickst

Sobald ihr so weit seid, helfen mir diese Infos am meisten:

1. die Bestätigung, dass das Supabase-Projekt angelegt ist
2. SQL-Fehler, falls eine Migration scheitert
3. Fehler aus der Edge Function, falls der Invite-Flow nicht deployed
4. Beobachtungen aus den ersten zwei Test-Usern

## Wenn du es maximal pragmatisch willst

Dann ist die kuerzeste sinnvolle Route:

1. Supabase-Projekt anlegen
2. vier Kernmigrationen ausfuehren
3. `friend-invites` deployen
4. zwei Test-User anlegen
5. Invite -> Availability -> automatisches Match -> Accept testen

