# Catchup Architekturvorschlag ohne Supabase

Dieser Vorschlag ist fuer euren Fall optimiert:

- moeglichst `0 Euro` starten
- eigenes Backend statt Supabase
- `Email + Passwort`
- `Calls` bereits im MVP
- `Realtime` nur dort, wo es echten Mehrwert bringt

## Zielbild

Ein schlankes Monolith-Backend verwaltet Auth, Freundschaften, Tagesstatus, Matching und Calls.
Die Daten liegen in Postgres.
Das Frontend spricht mit einer normalen HTTP-API.
Realtime wird nur fuer Friend Requests und Match-Updates ergaenzt.

## Empfohlener Stack

### Backend

- `Node.js`
- `TypeScript`
- `Fastify` oder `Express`

Empfehlung:
- `Fastify`, wenn ihr ein modernes, schnelles und sauberes API-Backend wollt
- `Express`, wenn ihr maximale Verbreitung und bekannte Patterns wollt

Ich wuerde fuer euch aktuell `Fastify` bevorzugen.

### Datenbank

- `Postgres`

Warum:
- passt perfekt zu eurem relationalen Modell
- stark fuer Friendships, Matching, Constraints und Transaktionen
- wir koennen einen Teil des bisherigen portablen Datenmodells weiterverwenden

### Auth

- `Email + Passwort`
- Session oder JWT-basierte Auth im eigenen Backend

Empfehlung:
- fuer MVP eher `JWT Access Token + Refresh Token`
- Passwoerter natuerlich gehasht, zum Beispiel mit `argon2`

### Realtime

- zuerst klein halten
- `SSE` oder `WebSocket` nur fuer:
  - `friend_requests`
  - `matches`
  - `match_responses`

Empfehlung:
- fuer MVP eher `SSE`

Warum:
- deutlich einfacher als volles bidirektionales WebSocket-Design
- fuer Status-Updates in eurer App oft voellig ausreichend

### Calls

- `Daily`

Warum:
- ihr wollt Calls schon im MVP
- Daily hat laut aktueller Pricing-Seite `10.000 free minutes every month`
- das spart euch riesigen WebRTC-Eigenaufwand

Quelle:
- https://www.daily.co/pricing/video-sdk/

## Was Postgres hier konkret bedeutet

Postgres ist eure zentrale Datenbank.
Dort speichern wir:

- Nutzer
- Profile
- Freundschaftsanfragen
- Freundschaften
- Tagesstatus
- Availability-Slots
- Matches
- Match-Responses
- Call-Sessions
- Call-Teilnehmer
- Streaks

Wichtiger Punkt:
Postgres ist nicht nur Speicher, sondern hilft uns auch bei:

- Constraints
- Unique Rules
- Transaktionen
- konkurrierendem Matching
- sauberen Statuswechseln

## Empfohlene Systemgrenzen

### API-Layer

Verantwortlich fuer:

- Requests annehmen
- Auth pruefen
- Responses formatieren
- Fehlercodes liefern

### Service-Layer

Verantwortlich fuer:

- Friend Request Logik
- Availability-Logik
- Matching-Logik
- Match-Responses
- Call-Orchestrierung
- Streak-Berechnung

### DB-Layer

Verantwortlich fuer:

- Migrationen
- SQL-Queries
- Transaktionen
- Constraints

## Realtime nur dort, wo es wirklich lohnt

Realtime wuerde ich fuer euch nicht auf alles werfen.

### Realtime ja

- eingehende Friend Requests
- neues Match verfuegbar
- andere Person hat Match angenommen oder abgelehnt

### Realtime nein oder spaeter

- Profil-Aenderungen
- Streak-Anzeige
- Availability-Listen
- historische Daten

### Pragmatiker-Regel

Wenn ein Screen auch mit `Refetch nach Write` gut funktioniert, braucht er im MVP kein echtes Realtime.

## Konkrete Hosting-Einschaetzung

### Datenbank

Ihr braucht eine Postgres-Instanz.

Das ist der Punkt, an dem `0 Euro fuer immer` ohne Supabase am schwierigsten wird.
Kostenlose Angebote sind oft:

- nur Trial-basiert
- schlafen ein
- loeschen Daten nach einer Zeit
- oder sind fuer echte Nutzung fragil

Das ist der groesste Nachteil des No-Supabase-Wegs.

### Backend-Hosting

Ein einfaches Node-Backend bekommt man oft kostenlos oder fast kostenlos gehostet.
Aber viele Free-Hoster schlafen ein oder haben Limits.

Wichtig:
- fuer Realtime ist ein einschlafender Service unschoen
- fuer Polling oder normale API ist es eher okay

## Was ich fuer euren MVP konkret empfehlen wuerde

### Variante A: maximal pragmatisch

- eigenes Node/TypeScript Backend
- Postgres
- Email + Passwort
- Daily
- erstmal Polling
- nur kleine Realtime-Schicht fuer Match-Updates

Das ist meine Empfehlung.

### Variante B: noch einfacher, aber schlechteres UX

- alles wie oben
- gar kein echtes Realtime
- nach Friend Request / Slot / Match Response immer refetchen

Das waere noch einfacher, aber ich wuerde fuer eure App wenigstens Match-Realtime nachziehen.

## Welche Teile ich zuerst bauen wuerde

1. Backend-Grundgeruest
2. Postgres anbinden
3. SQL-Migrationen aus dem bisherigen portablen Kern uebertragen
4. Signup/Login
5. Friend Requests
6. Availability
7. Matching
8. Match-Responses
9. Daily-Calls
10. kleine Realtime-Schicht

## Was ohne Supabase deutlich mehr Arbeit ist

- Auth selbst absichern
- Rollen und Berechtigungen im API-Layer pruefen
- Realtime selbst anbieten
- Cron oder Background-Jobs selbst fahren
- Deployment und Secrets selbst verwalten

## Warum es trotzdem machbar bleibt

Weil wir den Fachkern schon relativ passend vorbereitet haben:

- relationales Datenmodell
- Matching-Denke
- Statuslogik
- Trigger- und Guard-Ideen

Wir verlieren also nicht alles.
Wir muessen vor allem die Plattformschicht neu bauen.

## Meine klare Empfehlung

Wenn ihr wirklich ohne Supabase gehen wollt, dann so:

1. `Fastify + TypeScript`
2. `Postgres`
3. `JWT Auth`
4. `Daily`
5. `Polling first`
6. `SSE oder kleines Realtime-Layer nur fuer Friend Requests und Matches`

Das ist der beste Kompromiss aus:

- wenig Plattformbindung
- noch vertretbarem Aufwand
- brauchbarer Nutzererfahrung

## Was ich von dir als Naechstes brauchen wuerde

Wenn wir diesen Weg wirklich einschlagen sollen, brauche ich von dir als Entscheidung:

1. `Fastify` okay?
2. `JWT + Refresh Token` okay?
3. `Polling first, kleines Realtime fuer Matches` okay?
4. Seid ihr bereit, fuer die Datenbank notfalls spaeter doch ein paar Euro zu zahlen, falls ein dauerhaft kostenloses Hosting nicht stabil genug ist?

