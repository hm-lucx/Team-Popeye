# Supabase Setup ohne CLI-Zwang

Dieses Dokument beschreibt den einfachsten Weg, Catchup mit Supabase aufzusetzen, ohne dass ihr sofort eine lokale CLI- oder Docker-Umgebung braucht.

## Wichtig

Ihr seid aktuell nicht blockiert.
Der Backend-Kern im Repo kann weiterentwickelt werden, auch wenn es noch kein Supabase-Projekt und keinen `project ref` gibt.

Ein `project ref` wird erst dann wichtig, wenn ihr:

- ein echtes Supabase-Projekt per CLI verlinken wollt
- Edge Functions per CLI deployen wollt
- Management-API oder automatisierte Deployments nutzen wollt

## Empfohlener Weg fuer euch jetzt

1. Ein Supabase-Projekt im Dashboard erstellen
2. SQL-Migrationen manuell im SQL Editor ausfuehren
3. Edge Function `friend-invites` im Dashboard anlegen
4. Frontend gegen die echten RPCs und Tabellen testen

So bleibt ihr beweglich und seid nicht von der CLI abhaengig.

## Schritt 1: Supabase-Projekt anlegen

Wenn noch kein Projekt existiert:

1. Geht auf `database.new` oder in das Supabase Dashboard.
2. Erstellt ein neues Projekt.
3. Wartet, bis Datenbank und Auth bereit sind.

Offizielle Referenzen:

- Supabase Free Plan / Pricing: https://supabase.com/pricing
- Dashboard Edge Functions Quickstart: https://supabase.com/docs/guides/functions/quickstart-dashboard

## Schritt 2: SQL-Migrationen manuell ausfuehren

Im Supabase Dashboard:

1. Projekt oeffnen
2. `SQL Editor` oeffnen
3. Nacheinander diese Dateien aus dem Repo ausfuehren:

- [supabase/migrations/20260604120000_backend_sprint1_init.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604120000_backend_sprint1_init.sql:1)
- [supabase/migrations/20260604143000_backend_sprint2_social_and_availability.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604143000_backend_sprint2_social_and_availability.sql:1)
- [supabase/migrations/20260604162000_backend_sprint3_matching_vendor_light.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604162000_backend_sprint3_matching_vendor_light.sql:1)
- [supabase/migrations/20260604174000_backend_sprint3_match_trigger.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604174000_backend_sprint3_match_trigger.sql:1)

Hinweis:
Immer in dieser Reihenfolge ausfuehren, weil spaetere Migrationen auf frueheren Tabellen und Funktionen aufbauen.

Offizielle Referenz:

- Supabase SQL / Database Functions: https://supabase.com/docs/guides/database/functions

Optional fuer Realtime:

- [supabase/migrations/20260604180000_supabase_realtime_bridge.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604180000_supabase_realtime_bridge.sql:1)

Diese Migration ist bewusst separat, weil sie Supabase-spezifisch ist.
Wenn ihr Realtime sofort nutzen wollt, fuehrt sie nach den Kernmigrationen aus.

## Schritt 3: Edge Function ohne CLI deployen

Die Friend-Invite-Function kann auch direkt im Dashboard angelegt werden.

Im Dashboard:

1. `Edge Functions` oeffnen
2. `Deploy a new function`
3. `Via Editor`
4. Eine Function namens `friend-invites` anlegen
5. Den Code aus [supabase/functions/friend-invites/index.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/friend-invites/index.ts:1) uebernehmen
6. Falls noetig auch die Shared-Dateien logisch mit uebernehmen:

- [supabase/functions/_shared/cors.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/_shared/cors.ts:1)
- [supabase/functions/_shared/http.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/_shared/http.ts:1)
- [supabase/functions/_shared/supabase.ts](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/functions/_shared/supabase.ts:1)

Offizielle Referenzen:

- Dashboard Edge Functions Quickstart: https://supabase.com/docs/guides/functions/quickstart-dashboard
- Edge Functions Overview: https://supabase.com/docs/guides/functions

## Schritt 4: Project Ref spaeter finden, falls ihr ihn doch braucht

Wenn ihr spaeter die CLI oder automatische Deployments nutzen wollt:

- Die Project ID bzw. der `project ref` steckt in eurer Dashboard-URL
- laut Supabase-Doku bekommt ihr ihn auch ueber `Project -> Settings -> General`

Beispiele aus der offiziellen Doku:

- `https://supabase.com/dashboard/project/<project-id>`
- eine Reference ID sieht etwa so aus: `xvljpkujuwroxcuvossw`

Offizielle Referenzen:

- Supabase local development overview: https://supabase.com/docs/guides/local-development/overview
- Supabase troubleshooting note zum Project Ref: https://supabase.com/docs/guides/troubleshooting/forbidden-resource-error-from-the-cli-L6rm6l

## Schritt 5: Was wir dann sofort testen koennen

Sobald das Projekt steht, koennen wir diese Dinge direkt pruefen:

1. Signup erzeugt `profiles` und `streaks`
2. Invite-Code-Friend-Request funktioniert
3. Availability-RPCs funktionieren
4. Matching-RPCs funktionieren

Passende Checkliste:

- [docs/backend-smoke-tests.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-smoke-tests.md:1)

## Was ich von dir spaeter brauche

Nicht jetzt, aber fuer die echte Inbetriebnahme:

1. Bestaetigung, dass ein Supabase-Projekt angelegt wurde
2. Falls vorhanden: die Project-URL oder spaeter der `project ref`
3. Spaeter fuer Calls: Daily-Zugangsdaten

## Fazit

Ihr koennt ohne `project ref` weiterarbeiten.
Ein Projekt im Dashboard reicht voellig aus, um den aktuellen Stand spaeter manuell live zu schalten.
