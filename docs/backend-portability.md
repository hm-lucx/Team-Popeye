# Backend Portability

Dieses Dokument beschreibt, wie wir Catchup vendor-light aufbauen.
Ziel ist nicht volle Plattform-Unabhaengigkeit ab Tag 1, sondern ein Aufbau, bei dem ein spaeterer Umzug deutlich weniger weh tut.

## Prinzip

Die Fachlogik lebt moeglichst nah an normalem Postgres.
Plattform-spezifische Teile bleiben duenn und austauschbar.

## Was portabel bleibt

### Postgres-Kern

Diese Teile sind bewusst so gebaut, dass sie sich spaeter weitgehend uebernehmen lassen:

- Datenmodell und Tabellen
- Constraints und Indexe
- Statuslogik
- Matching-Funktionen
- Response- und Transition-Guards
- einfache Hintergrundfunktionen wie `expire_pending_matches`

Dateien

- [supabase/migrations/20260604120000_backend_sprint1_init.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604120000_backend_sprint1_init.sql:1)
- [supabase/migrations/20260604143000_backend_sprint2_social_and_availability.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604143000_backend_sprint2_social_and_availability.sql:1)
- [supabase/migrations/20260604162000_backend_sprint3_matching_vendor_light.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604162000_backend_sprint3_matching_vendor_light.sql:1)
- [supabase/migrations/20260604174000_backend_sprint3_match_trigger.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604174000_backend_sprint3_match_trigger.sql:1)

### Duenne Adapter

Diese Teile sind zwar aktuell Supabase-nah, aber absichtlich klein gehalten:

- `auth.uid()` in den oeffentlichen Wrapper-Funktionen
- RLS-Policies
- Edge Function `friend-invites`
- spaeter Realtime-Publications
- spaeter Cron-Integration

Konkretes Beispiel:

- [supabase/migrations/20260604180000_supabase_realtime_bridge.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604180000_supabase_realtime_bridge.sql:1)

Wenn ihr spaeter umzieht, ersetzt ihr hauptsaechlich diese Schicht.

## Was bei einem spaeteren Umzug neu gebaut werden muesste

1. Auth-Kontext
Statt `auth.uid()` braucht ihr dann den User-Kontext aus eurem neuen Backend.

2. Zugriffsschutz
Supabase RLS waere dann durch API- oder Service-Layer-Checks zu ersetzen.

3. Transport
Edge Functions und RPC-Aufrufe muessen in euer neues HTTP- oder Service-Interface ueberfuehrt werden.

4. Realtime
Supabase Realtime koennte spaeter durch WebSockets, SSE oder einen Event-Bus ersetzt werden.

## Warum dieser Zuschnitt sinnvoll ist

- Ihr bekommt jetzt einen schnellen MVP.
- Die fachlich riskanten Teile werden frueh stabil.
- Ein spaeterer Plattformwechsel wird teurer, aber nicht chaotisch.
- Das Frontend haengt an klaren Contracts statt an internen Tabellen-Tricks.

## Praktische Regel fuer die naechsten Sprints

Neue Kernlogik soll nach Moeglichkeit in eine dieser Kategorien fallen:

- normales SQL
- normale Postgres-Funktion
- duenne Supabase-spezifische Wrapper-Schicht

Wenn wir etwas bauen, das nur als Supabase-Sonderfall existiert, sollten wir es als Adapter markieren und klein halten.
