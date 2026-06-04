# Backend Contracts Sprint 3

Dieses Dokument beschreibt den Handoff fuer Matching und Match-Responses.
Die Kernlogik liegt bewusst in Postgres-Funktionen, damit der Fachkern spaeter leichter in ein anderes Setup uebernommen werden kann.

## 1. RPC `try_create_match_for_me`

Aufruf

```json
{
  "p_local_day": "2026-06-04",
  "p_expires_in_minutes": 15
}
```

Verhalten
- prueft serverseitig, ob der aktuelle Nutzer fuer diesen lokalen Tag matchbar ist
- beruecksichtigt nur bestaetigte Freundschaften
- verlangt mindestens 5 Minuten Ueberschneidung
- schliesst Nutzer mit aktivem Match am selben Tag aus
- waehlt zufaellig aus eligible Freunden, mit leichter Bevorzugung von weniger kuerzlich gematchten Freundschaften
- wird zusaetzlich automatisch beim Anlegen oder Aendern eines Availability-Slots serverseitig angestossen

Response
- `null`, wenn kein Match moeglich ist
- sonst der neu angelegte `matches`-Datensatz

Wichtige Hinweise
- das RPC arbeitet serverseitig
- Race Conditions werden ueber Postgres Advisory Locks reduziert
- die eigentliche Fachlogik liegt in `private.create_match_for_user(...)`
- das RPC bleibt trotzdem nuetzlich fuer manuelle Retries, Sweeper oder spaetere Cron-Jobs

## 2. RPC `respond_to_my_match`

Aufruf

```json
{
  "p_match_id": "uuid",
  "p_response": "accepted"
}
```

Zulaessige Werte
- `accepted`
- `declined`

Verhalten
- nur Match-Teilnehmer duerfen antworten
- nur `pending` Matches sind beantwortbar
- beim zweiten `accepted` springt das Match automatisch auf `accepted`
- bei einem `declined` springt das Match automatisch auf `declined`
- wenn das Match inzwischen abgelaufen ist, wird es zuerst auf `expired` gesetzt und dann als solcher Match-Datensatz zurueckgegeben

Response
- der aktualisierte `matches`-Datensatz

## 3. Match-Statusregeln

Aktuell erlaubte Uebergaenge:

- `pending -> accepted`
- `pending -> declined`
- `pending -> expired`
- `pending -> cancelled`
- `accepted -> completed`
- `accepted -> missed`
- `accepted -> cancelled`

Terminale Stati bleiben danach unveraendert.

## 4. Relevante Tabellen fuer das Frontend

Direkt lesbar per bestehender RLS:

- `matches`
- `match_responses`

Wichtige Felder:

- `matches.id`
- `matches.local_day`
- `matches.overlap_starts_at`
- `matches.overlap_ends_at`
- `matches.status`
- `matches.expires_at`
- `matches.accepted_at`
- `matches.declined_at`

- `match_responses.match_id`
- `match_responses.user_id`
- `match_responses.response`
- `match_responses.responded_at`

## 5. Realtime-Vorbereitung

Wenn ihr Supabase Realtime fuer Match-Updates verwenden wollt, sind dies die ersten Kandidaten:

- `public.friend_requests`
- `public.matches`
- `public.match_responses`

Optionaler Supabase-Schritt:

```sql
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_responses;
```

Das ist bewusst nicht Teil der Kernmigration, damit der Fachkern nicht unnoetig von Supabase-spezifischen Publications abhaengt.

Inzwischen gibt es dafuer eine optionale, idempotente Supabase-Bruecke:

- [supabase/migrations/20260604180000_supabase_realtime_bridge.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604180000_supabase_realtime_bridge.sql:1)

Frontend-Handoff:

- [docs/frontend-realtime-handoff.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/frontend-realtime-handoff.md:1)

## 6. Availability-Trigger

Ab jetzt gilt:

- `availability_slots` haben einen `AFTER INSERT/UPDATE`-Trigger
- jeder neue oder geaenderte Slot startet automatisch einen serverseitigen Match-Versuch
- der Trigger nutzt dieselbe Kernfunktion wie das manuelle RPC

Fuer das Frontend bedeutet das:

- nach dem Setzen eines Slots kann direkt ein neues `pending` Match existieren
- ohne Realtime sollte das Frontend nach erfolgreichem Slot-Write die Match-Liste oder den aktuellen Tagesstatus neu laden
