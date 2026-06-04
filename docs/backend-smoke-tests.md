# Backend Sprint 1 Smoke Tests

Diese Checks sind fuer die erste Verifikation des Schemas gedacht, sobald das Supabase-Projekt lokal oder remote verbunden ist.

## 1. Profil-Bootstrap nach Signup

Erwartung
- Ein neuer Auth-User erzeugt automatisch genau ein Profil.
- Fuer denselben User wird genau ein `streaks`-Datensatz angelegt.
- `invite_code` ist gesetzt.

Zu pruefen
- `profiles.id = auth.users.id`
- `profiles.timezone` faellt auf `UTC` zurueck, wenn nichts uebergeben wurde
- `streaks.user_id = profiles.id`

## 2. RLS fuer eigene Daten

Mit einem normalen eingeloggten Nutzer pruefen:

- eigenes Profil lesbar
- fremdes, nicht befreundetes Profil nicht lesbar
- eigener Availability-Slot lesbar und schreibbar
- fremder Availability-Slot nicht lesbar
- eigener `daily_status` lesbar und schreibbar
- fremder `daily_status` nicht lesbar

## 3. Eindeutigkeit im Sozialgraph

Zu pruefen
- dieselbe Freundschaft kann nicht doppelt in umgekehrter Reihenfolge angelegt werden
- zwei gleichzeitige `pending` Friend Requests fuer dieselbe Paarung sind nicht moeglich

## 4. Slot-Guards

Zu pruefen
- `ends_at` muss spaeter als `starts_at` sein
- Slot muss mindestens 5 Minuten lang sein
- pro Nutzer und `local_day` ist nur ein Slot erlaubt

## 5. Match-Guards

Zu pruefen
- derselbe Nutzer kann nicht mit sich selbst gematched werden
- ein aktives Match mit Status `pending` oder `accepted` blockiert ein weiteres aktives Match am selben `local_day`
- beim Anlegen eines Matches entstehen automatisch zwei `match_responses`

## 6. Leserechte fuer spaetere Bereiche

Zu pruefen
- Match-Teilnehmer koennen ihr Match lesen
- Unbeteiligte koennen Match und Call Session nicht lesen
- Nutzer koennen ihre eigene Streak lesen

## 7. Friend-Request-Lebenszyklus

Zu pruefen
- eingeloggter Nutzer kann ueber die Edge Function mit gueltigem Invite-Code eine Anfrage erstellen
- ungueltiger Invite-Code liefert sauberen Fehler
- derselbe Nutzer kann keine doppelte offene Anfrage an dieselbe Person erstellen
- beim `accept` entsteht automatisch genau eine `friendship`
- `accept` und `decline` funktionieren nur fuer den Addressee
- `cancel` funktioniert nur fuer den Requester

## 8. Availability RPCs

Zu pruefen
- `upsert_my_availability_slot` legt einen Slot an
- ein zweiter Aufruf fuer denselben Tag aktualisiert den vorhandenen Slot
- `set_my_daily_status` entfernt einen vorhandenen Slot fuer denselben Tag
- `upsert_my_availability_slot` entfernt einen vorhandenen `daily_status` fuer denselben Tag
- Slots, deren Start oder Ende nicht auf `local_day` fallen, werden abgelehnt

## 9. Matching-RPCs und Match-Lebenszyklus

Zu pruefen
- `try_create_match_for_me` liefert `null`, wenn kein eligible Freund vorhanden ist
- `try_create_match_for_me` erzeugt bei passendem Freund genau ein `pending` Match
- beim Match-Anlegen entstehen automatisch zwei `match_responses`
- `respond_to_my_match(..., accepted)` setzt die eigene Response auf `accepted`
- nach zwei Accepts springt das Match auf `accepted`
- ein `declined` setzt das Match auf `declined`
- wenn ein pending Match bereits abgelaufen ist, gibt `respond_to_my_match(...)` einen Match-Datensatz mit Status `expired` zurueck
- `expire_pending_matches(...)` setzt ueberfaellige pending Matches auf `expired`

## 10. Automatischer Match-Trigger nach Availability-Write

Zu pruefen
- setzt Nutzer A einen Slot ohne passenden Freund, entsteht noch kein Match
- setzt Nutzer B danach einen kompatiblen Slot, entsteht automatisch ein `pending` Match ohne separaten RPC-Aufruf
- aendert ein Nutzer seinen Slot in einen passenden Zeitraum, kann dadurch automatisch ein Match entstehen
- der Trigger erzeugt keine doppelten aktiven Matches, wenn zwei Nutzer fast gleichzeitig ihren Slot setzen
- der Trigger erzeugt kein neues Match, wenn einer der Nutzer bereits ein aktives Match fuer denselben Tag hat

## 11. Realtime-Bruecke

Zu pruefen
- die optionale Realtime-Migration laeuft ohne Fehler in einem Supabase-Projekt
- `friend_requests`, `matches` und `match_responses` sind in `supabase_realtime` enthalten
- nach einem Friend-Request-Update kommt im Frontend ein Realtime-Event an
- nach neuem Match oder Match-Response-Update kommt im Frontend ein Realtime-Event an

## 12. Portabilitaets-Check

Zu pruefen
- Kernlogik fuer Matching lebt in SQL-Funktionen und nicht nur in Edge-Function-Code
- Realtime-spezifische Schritte sind optional dokumentiert und nicht in der Kernmigration verdrahtet
- Supabase-spezifische Wrapper bleiben klein genug, um spaeter ersetzt zu werden

## Empfohlene Reihenfolge

1. Migration anwenden
2. Test-User anlegen
3. Profil-Bootstrap pruefen
4. RLS mit zwei verschiedenen Nutzern gegentesten
5. Friend-Request- und Availability-Flows validieren
6. Automatischen Match-Trigger validieren
7. Matching-RPCs und Match-Responses validieren
8. Realtime-Bruecke validieren
9. Match- und Constraint-Faelle validieren
