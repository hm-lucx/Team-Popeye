# Catchup Backend Architektur

Dieses Dokument beschreibt den Stand nach Backend Sprint 3.
Sprint 1 hat das Fundament aus Datenmodell, RLS und Profil-Bootstrap gelegt.
Sprint 2 erweitert das Backend um serverseitige Write-Flows fuer Freundschaftsanfragen und Tagesverfuegbarkeit.
Sprint 3 fuegt vendor-light Matching-Logik und Match-Statusfuehrung hinzu.

## Struktur im Repository

- `supabase/migrations/20260604120000_backend_sprint1_init.sql`
- `supabase/migrations/20260604143000_backend_sprint2_social_and_availability.sql`
- `supabase/migrations/20260604162000_backend_sprint3_matching_vendor_light.sql`
- `supabase/migrations/20260604174000_backend_sprint3_match_trigger.sql`
- `supabase/migrations/20260604180000_supabase_realtime_bridge.sql`
- `supabase/functions/friend-invites/index.ts`
- `docs/catchup-mvp-issues.md`
- `docs/backend-sprint-plan.md`
- `docs/backend-architecture.md`
- `docs/backend-contracts-sprint2.md`
- `docs/backend-contracts-sprint3.md`
- `docs/backend-portability.md`
- `docs/backend-resources.md`

## Technische Leitentscheidungen

### 1. Lokaler Tag statt reiner UTC-Logik

Der fachliche "heutige" Tag richtet sich nach der Zeitzone des Nutzers.
Darum speichern wir fuer Tages-Entitaeten sowohl:

- `local_day` als fachlichen Tag
- UTC-Zeitstempel fuer echte Zeitfenster und Events
- `timezone` dort, wo ein Slot rekonstruierbar bleiben soll

Das verhindert spaetere Probleme bei Matching, Streaks und "Heute kann ich nicht".

### 2. Profile basieren direkt auf `auth.users`

`profiles.id` ist identisch zu `auth.users.id`.
Das reduziert Joins, vereinfacht RLS und macht Ownership-Regeln klar.

### 3. Invite-Code auf Profil-Ebene

Jedes Profil bekommt beim Signup automatisch einen eindeutigen `invite_code`.
Das macht den spaeteren Invite-Flow einfacher, weil kein globales Adressbuch oder gesonderter Invite-Store noetig ist.

### 4. Kritische Logik bleibt serverseitig

Direkte Client-Schreibrechte gibt es nur fuer unkritische eigene Tagesdaten:

- `availability_slots`
- `daily_status`
- eigenes `profiles`-Update

Kritische Bereiche bleiben fuer spaetere Edge Functions reserviert:

- `friendships`
- `matches`
- `match_responses`
- `call_sessions`
- `call_participants`
- `streaks`

### 5. Vendor-light statt Vendor-heavy

Der Fachkern wird moeglichst als normales Postgres modelliert.
Supabase bleibt wichtig fuer Auth, RLS, Realtime und Deploy, aber die Kernlogik wird nicht in viele verstreute Plattform-Sonderfaelle zerlegt.

Das bedeutet konkret:

- Kernlogik liegt in SQL und PL/pgSQL
- Supabase-spezifische Wrapper bleiben duenn
- spaetere Umzuege bleiben aufwendig, aber beherrschbar

### 6. Supabase-spezifische Bruecken separat halten

Wenn wir etwas klar Supabase-spezifisches brauchen, kapseln wir es in eigene, klar erkennbare Artefakte.
Realtime ist dafuer das erste Beispiel.

Dadurch bleibt sichtbar:

- was Teil des portablen Postgres-Kerns ist
- was nur fuer Supabase-Betrieb relevant ist

## Datenmodell im Ueberblick

### Nutzer und Sozialgraph

- `profiles`
  Speichert Anzeigename, Avatar, Zeitzone und Invite-Code.

- `friend_requests`
  Hält den Anfragezustand zwischen zwei Nutzern fest.

- `friendships`
  Repraesentiert bestaetigte Freundschaften.
  Ein Unique Index auf der normalisierten Nutzer-Paarung verhindert Duplikate.

### Tagesstatus und Verfuegbarkeit

- `availability_slots`
  Ein Slot pro Nutzer und `local_day`.
  Zeitpunkte liegen in UTC, der Slot bleibt aber dem lokalen Tag zugeordnet.

- `daily_status`
  Speichert bewusste Tagesabmeldungen wie `unavailable` oder `skipped`.

### Matching und Calls

- `matches`
  Fachlicher Match-Datensatz fuer zwei Freunde an einem lokalen Tag.
  Eine Trigger-Regel verhindert mehr als ein aktives Match pro Nutzer und Tag.

- `match_responses`
  Teilnehmerbezogene Antwortdaten zu einem Match.
  Werden beim Anlegen eines Matches automatisch erzeugt.

- `call_sessions`
  Abstrakte Call-Sitzung, provider-faehig modelliert.

- `call_participants`
  Teilnehmerstatus pro Call.

### Retention

- `streaks`
  Serverseitiger Speicherort fuer aktuelle und laengste Streak.

## Statuswerte

### `friend_request_status`

- `pending`
- `accepted`
- `declined`
- `cancelled`
- `expired`

### `daily_status_code`

- `unavailable`
- `skipped`

### `match_status`

- `pending`
- `accepted`
- `declined`
- `expired`
- `completed`
- `cancelled`
- `missed`

### `match_response_status`

- `pending`
- `accepted`
- `declined`

### `call_session_status`

- `scheduled`
- `active`
- `ended`
- `failed`
- `cancelled`

### `call_participant_status`

- `invited`
- `token_issued`
- `joined`
- `left`
- `missed`

## RLS-Modell

### Bereits fuer Clients freigegeben

- `profiles`
  Eigene Profile koennen gelesen und aktualisiert werden.
  Bestaetigte Freunde koennen Profile ebenfalls lesen.

- `availability_slots`
  Nur eigene Slots koennen gelesen und veraendert werden.

- `daily_status`
  Nur eigener Tagesstatus kann gelesen und veraendert werden.

### Bereits lesbar, aber nicht direkt client-schreibbar

- `friend_requests`
  Nur Beteiligte koennen Requests lesen.

- `friendships`
  Nur Beteiligte koennen bestaetigte Freundschaften lesen.

- `matches`
- `match_responses`
- `call_sessions`
- `call_participants`
- `streaks`

Hier ist die Ownership fuer Lesepfade schon definiert, Schreibpfade sollen aber in spaeteren Sprints ueber Edge Functions oder RPCs laufen.

## Automationen im Schema

### Profil-Bootstrap

Ein Trigger auf `auth.users` erzeugt automatisch:

- einen `profiles`-Datensatz
- einen `streaks`-Datensatz
- einen eindeutigen `invite_code`

### Match-Antworten

Beim Anlegen eines Matches werden automatisch zwei `match_responses` erzeugt.
Das spart spaeter Frontend-Sonderfaelle.

### Freundschaftsanfragen

Das Backend fuehrt den Friend-Request-Lebenszyklus jetzt kontrolliert:

- Invite-Code wird serverseitig in der Edge Function aufgeloest
- `friend_requests` koennen nur von beteiligten Nutzern gelesen werden
- Statuswechsel sind auf sinnvolle Uebergaenge begrenzt
- bei `accepted` entsteht automatisch eine `friendship`

### Matching

Das Matching folgt jetzt einem portablen Zwei-Schichten-Modell:

- private Kernfunktionen fuer Kandidatenfindung, Locking und Match-Erzeugung
- duenne oeffentliche RPC-Wrapper fuer den aktuell eingeloggten Nutzer

Wichtige Schutzmechanismen:

- Advisory Locks gegen parallele Doppel-Erzeugung
- Trigger fuer erlaubte Statuswechsel
- Trigger fuer automatische Match-Statusfuehrung aus Teilnehmer-Responses
- Update von `friendships.last_matched_at` bei akzeptierten Matches
- automatischer Match-Versuch nach `availability_slots` Insert oder Update

### Realtime-Bruecke

Die Supabase-Realtime-Anbindung ist absichtlich nicht in den Matching-Kern gemischt.
Stattdessen gibt es eine separate, optionale Migration, die diese Tabellen zur Publication hinzufuegt:

- `friend_requests`
- `matches`
- `match_responses`

### Updated-At Pflege

Alle zentralen Tabellen nutzen denselben `updated_at`-Trigger.

### Tagesstatus-Synchronisierung

`availability_slots` und `daily_status` sind gegenseitig exklusiv:

- setzt ein Nutzer einen Slot, wird der Tagesstatus fuer denselben Tag entfernt
- setzt ein Nutzer `daily_status`, wird ein vorhandener Slot fuer denselben Tag entfernt

Damit bleibt der Tageszustand auch dann konsistent, wenn spaeter unterschiedliche Clients oder Flows auf dieselben Tabellen schreiben.

## Frontend-Handoff nach Sprint 3

Diese Felder und Konzepte koennen als stabil betrachtet werden:

- `profiles`
  `id`, `display_name`, `avatar_url`, `timezone`, `invite_code`

- `availability_slots`
  `user_id`, `local_day`, `timezone`, `starts_at`, `ends_at`

- `daily_status`
  `user_id`, `local_day`, `status`

- `friend_requests`
  `requester_id`, `addressee_id`, `status`

- `matches`
  `local_day`, `overlap_starts_at`, `overlap_ends_at`, `status`

Zusatz fuer Sprint 2

- Edge Function `friend-invites` fuer `create`, `accept`, `decline`, `cancel`
- RPCs fuer `upsert_my_availability_slot`, `clear_my_availability_slot`, `set_my_daily_status`, `clear_my_daily_status`

Zusatz fuer Sprint 3

- RPC `try_create_match_for_me`
- RPC `respond_to_my_match`
- lesbare `match_responses` fuer Match-Teilnehmer
- Realtime-Kandidaten: `friend_requests`, `matches`, `match_responses`
- optionaler Frontend-Handoff fuer Realtime-Subscriptions

## Naechste Backend-Schritte

1. Expiry-Jobs ueber Cron oder Backend-Worker anbinden
2. Match-Refresh-Strategie fuer bereits bestehende Slots und neue Freundschaften erweitern
3. Match-Read-Model oder Tages-Home-View schaerfen
4. Call-Provider integrieren
