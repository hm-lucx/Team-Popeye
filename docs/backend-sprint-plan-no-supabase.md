# Catchup Backend Sprintplan ohne Supabase

Dieser Plan ist fuer ein kleines Team mit einer Person im Backend und einer Person im Frontend gedacht.
Ziel ist ein testbarer MVP ohne Supabase, aber ohne unnötig schwere Eigeninfrastruktur.

## Grundannahmen

Ich plane hier bewusst mit einem schlanken Setup:

- eigenes `Node.js` oder `TypeScript` Backend
- `Postgres` als Datenbank
- normale SQL-Migrationen
- HTTP-API statt Supabase RPCs
- Auth im eigenen Backend
- zuerst `Polling`, Realtime spaeter oder optional

Das ist nicht der maximal schicke Weg, aber der schnellste sinnvolle Weg ohne Supabase.

## Ziel des Backend-Tracks

Am Ende soll das Backend drei Dinge stabil koennen:

- Nutzer, Freundschaften und Tagesstatus sicher verwalten
- Freunde anhand ueberschneidender Slots matchen
- akzeptierte Matches bis zum Call sauber fuehren

## Architekturprinzipien

- Fachlogik bleibt serverseitig.
- Postgres ist der System of Record.
- Das Frontend spricht nur mit klaren HTTP-Contracts.
- Realtime ist kein MVP-Zwang, Polling reicht zuerst.
- Alles wird so gebaut, dass spaeter Hosting oder Auth-Komponenten austauschbar bleiben.

## Empfohlene Modulgrenzen

### Backend

- `auth`
- `profiles`
- `friend-requests`
- `friendships`
- `availability`
- `matching`
- `calls`
- `streaks`

### Infrastruktur

- `db`
- `migrations`
- `config`
- `logging`
- `jobs`

## Definition of Done pro Sprint

- Migrationen sind versioniert und reproduzierbar.
- Neue Endpunkte haben Request-, Response- und Fehlerformat.
- Es gibt Happy-Path-Tests und wichtige Negativfaelle.
- Das Frontend hat pro Sprint stabile Contracts.
- Keine kritische Fachregel lebt nur im Frontend.

## Sprint 1: Eigenes Fundament

Sprintziel

Ein lauffaehiges Backend-Grundgeruest mit Datenbank, Auth-Basis und erstem Datenmodell steht.

Backend-Umfang

- Backend-Repo-Struktur und lokale Entwicklungsumgebung aufsetzen
- Postgres anbinden
- Migrationssystem einrichten
- Tabellen fuer `users`, `profiles`, `friend_requests`, `friendships`, `availability_slots`, `daily_status`, `matches`, `match_responses`, `call_sessions`, `call_participants`, `streaks` anlegen
- Passwort- oder Session-basierte Auth-Basis implementieren
- Signup, Login und Profil-Bootstrap serverseitig bauen
- einfache Zugriffskontrolle im API-Layer definieren

Deliverables

- erstes Backend-Projektgeruest
- Datenbankschema als SQL-Migrationen
- Auth-Endpunkte fuer Signup und Login
- minimale Architektur-Doku

Frontend-Handoff

- Auth-Contract
- Profil-Contract
- stabile Feldnamen fuer Nutzer, Zeitzone und Invite-Code

Risiken und Fokus

- Auth nicht unnötig kompliziert machen
- Zeitzonen frueh sauber modellieren
- Datenbank zuerst stabil, Framework-Diskussionen spaeter

Exit-Kriterien

- Nutzer kann sich registrieren und einloggen
- Profil wird automatisch erzeugt
- Datenbank laeuft lokal oder in Testumgebung

## Sprint 2: Social Graph und Tagesverfuegbarkeit

Sprintziel

Freundschaftsflow und Tagesstatus funktionieren komplett ueber die eigene API.

Backend-Umfang

- Invite-Code oder Invite-Link-Flow implementieren
- Friend Requests erstellen, annehmen, ablehnen, abbrechen
- Duplicate Requests und Duplicate Friendships verhindern
- Endpunkte fuer Availability anlegen, aendern, loeschen
- Endpunkte fuer `Heute kann ich nicht` bauen
- Regel umsetzen: `daily_status` und `availability_slot` sind fuer denselben Tag gegenseitig exklusiv

Deliverables

- REST-Endpunkte fuer Friend Requests
- REST-Endpunkte fuer Availability und Daily Status
- Tests fuer Slot-Validierung und Anfrage-Statuswechsel
- dokumentierte Fehlercodes

Frontend-Handoff

- Endpunkte fuer Invite-Code-Eingabe und Freundschaftsanfragen
- Endpunkte fuer Slot-Speicherung und Tagesstatus
- Fehlercodes wie `already_friends`, `invalid_invite_code`, `slot_too_short`

Risiken und Fokus

- Invite-Flow braucht Spam-Schutz
- Zugriffsschutz muss im Backend sauber sein, weil kein RLS hilft

Exit-Kriterien

- Zwei Nutzer koennen zu bestaetigten Freunden werden
- Ein Nutzer kann sich fuer heute verfuegbar oder unavailable setzen

## Sprint 3: Matching und Match-Lebenszyklus

Sprintziel

Das Kernverhalten der App funktioniert ohne Realtime-Zwang.

Backend-Umfang

- Matching-Service implementieren
- Zufallsauswahl aus eligible Freunden bauen
- Schutz vor mehr als einem aktiven Match pro Nutzer und Tag
- Match-Erzeugung beim Setzen eines Slots anstossen
- Endpunkte fuer Match-Liste und Match-Details bauen
- Match-Responses `accept` und `decline` implementieren
- Expiry-Logik fuer offene Matches bauen

Deliverables

- Matching-Service mit Testmatrix
- Endpunkte fuer Match-Liste, Match-Details und Match-Response
- Statusmodell fuer `pending`, `accepted`, `declined`, `expired`, `completed`, `missed`
- Polling-taugliche Contracts fuer das Frontend

Frontend-Handoff

- Match-Contract
- Polling-Strategie fuer neue Matches und Statuswechsel
- klare Regeln, wann Match-Karten erscheinen oder verschwinden

Risiken und Fokus

- Race Conditions bei parallelem Matching
- kein Deadlock oder Doppel-Match
- Polling so bauen, dass das Frontend erst einmal stabil bleibt

Exit-Kriterien

- Aus zwei verfuegbaren Freunden kann ein gueltiges `pending` Match entstehen
- Beide Nutzer koennen reagieren
- Match springt korrekt auf `accepted` oder `declined`

## Sprint 4: Calls, Jobs und Hardening

Sprintziel

Akzeptierte Matches fuehren in einen Call, und das System ist bereit fuer erste echte Tests.

Backend-Umfang

- Call-Provider-Abstraktion im eigenen Backend anlegen
- ersten Call-Provider integrieren
- Join-Token oder Join-Infos serverseitig ausgeben
- Job-System fuer Match-Expiry und spaeter Missed-Call-Logik bauen
- Streak-Regeln umsetzen
- Logging, Rate Limits und Basis-Observability ergaenzen

Deliverables

- Call-Endpunkte oder Call-Service
- Job fuer `expired` Matches
- serverseitige Streak-Aktualisierung
- Launch-Checklist fuer Env Vars, Secrets und Smoke Tests

Frontend-Handoff

- Call-Join-Flow
- Daten fuer Streak-Anzeige
- Status fuer `accepted`, `completed`, `missed`

Risiken und Fokus

- keine Provider-Secrets im Frontend
- Job-Ausfuehrung stabil halten
- Fehler bei Call-Erstellung muessen sichtbar sein

Exit-Kriterien

- Ein akzeptiertes Match fuehrt in genau einen Call
- Nur Teilnehmer bekommen Join-Infos
- Streak und Tagesergebnis werden serverseitig korrekt berechnet

## Empfohlene technische Vereinfachungen

Damit es ohne Supabase schnell bleibt, wuerde ich bewusst diese Entscheidungen treffen:

1. Email plus Passwort statt Magic Link
2. Polling statt Realtime im ersten MVP
3. Monolithisches Backend statt Microservices
4. SQL-first Datenmodell statt frueh viele ORMs oder Abstraktionen
5. Ein einfacher Background-Worker statt sofort komplexe Queue-Infrastruktur

## Woechentliche Routine

Montag

- Sprintziel fixieren
- offene Architekturfragen schliessen
- Frontend-Contracts abstimmen

Mittwoch

- Backend-Checkpoint
- erste echte Payloads mit dem Frontend pruefen
- Risiken bei Auth, Matching oder Jobs frueh eskalieren

Freitag

- Demo mit echten Requests und Responses
- Backlog nachziehen
- technische Schulden sichtbar dokumentieren

## Empfohlene Reihenfolge innerhalb des Backends

1. Datenbank und Migrationen
2. Auth
3. Friend Requests und Availability
4. Matching
5. Polling-Read-Model
6. Calls
7. Jobs, Streaks und Hardening

## Was ohne Supabase mehr Aufwand macht

- Auth und Session-Handling
- Zugriffsschutz statt RLS
- Realtime, falls ihr es frueh wollt
- Jobs und Betriebslogik
- Deployment und Secrets

## Was ohne Supabase trotzdem schnell bleibt

- Datenmodell
- Matching-Logik
- Availability-Flow
- Freundschaftsflow
- HTTP-API fuer das Frontend

## Realistische Aufwandsabschaetzung

Wenn wir pragmatisch bleiben:

- erster testbarer Backend-Stand: eher 3 bis 6 Tage
- erster brauchbarer MVP-Flow: eher 1 Woche
- mit Calls, Hardening und Tests: eher 2 Wochen

Wenn ihr an vielen Stellen Produkt- und Infrastrukturentscheidungen offen lasst, wird es laenger.

## Was ich von dir spaeter brauchen werde

Nicht sofort, aber frueh:

1. Ob ihr Email plus Passwort okay findet
2. Ob Polling fuer MVP okay ist
3. Wo ihr Postgres hosten wollt
4. Ob Calls im MVP schon zwingend sein muessen

## Konkreter Start ohne Supabase

Wenn wir diesen Weg wirklich gehen, wuerde ich als erstes diese drei Tickets ziehen:

1. eigenes Backend-Grundgeruest plus Postgres-Verbindung
2. SQL-Migrationen aus dem bisherigen portablen Kern ableiten
3. Auth- und Profil-Bootstrap-Endpunkte bauen

