# Catchup Backend Sprintplan

Dieser Plan ist fuer ein kleines Team mit einer Person im Backend und einer Person im Frontend gedacht.
Empfehlung: 4 Sprints à 1 Woche. Das passt gut zu einem MVP, weil ihr schnell Schnittstellen testen und Entscheidungen nachjustieren koennt.

Wenn ihr lieber 2-Wochen-Sprints fahrt, koennt ihr Sprint 1 und 2 sowie Sprint 3 und 4 jeweils zusammenziehen.

## Ziel des Backend-Tracks

Das Backend soll am Ende des Tracks drei Dinge stabil koennen:
- sichere Nutzer- und Freundschaftsdaten verwalten
- fuer denselben Tag valide Matches erzeugen und deren Status fuehren
- fuer akzeptierte Matches einen sicheren 5-Minuten-Call bereitstellen

## Arbeitsprinzipien

- Alle fachlich kritischen Operationen laufen serverseitig.
- Datenbankschema, RLS und Edge Functions werden frueh gebaut, nicht erst am Ende.
- Das Frontend bekommt pro Sprint feste Datenvertraege statt "wir schauen spaeter".
- Jede Woche endet mit testbaren Beispiel-Requests und Beispiel-Responses.

## Definition of Done pro Sprint

- Migrationen sind versioniert und lokal oder in der Zielumgebung reproduzierbar.
- RLS ist fuer neue Tabellen aktiv und gegen typische Fehlpfade geprueft.
- Jede neue Edge Function oder Backend-Funktion ist dokumentiert.
- Es gibt mindestens Happy-Path-Tests und 2 bis 3 wichtige Negativfaelle.
- Das Frontend hat eine kurze Contract-Doku mit Request-, Response- und Fehlerformat.

## Sprint 1: Fundament und Datenmodell

Sprintziel
Das technische Fundament steht, damit Frontend und Backend parallel arbeiten koennen.

Backend-Umfang
- Supabase-Projektstruktur und lokale Arbeitsweise festziehen.
- `profiles`, `friend_requests`, `friendships`, `availability_slots`, `daily_status`, `matches`, `match_responses`, `call_sessions`, `call_participants`, `streaks` als Migrationen anlegen.
- `profiles.id = auth.users.id` umsetzen.
- Basis-Constraints, Indexe und Zeitlogik fuer lokale Tage definieren.
- RLS fuer `profiles`, `friend_requests`, `friendships`, `availability_slots` und `daily_status` aufsetzen.
- Profil-Bootstrap nach Signup serverseitig definieren.

Deliverables
- erste SQL-Migrationen
- RLS-Policies fuer die Grundtabellen
- Doku `docs/current-state.md` oder `docs/backend-architecture.md`
- Seed-Daten oder minimale Testdaten fuer 2 bis 3 Nutzer

Frontend-Handoff
- Datenmodell fuer `profiles`, `friend_requests`, `friendships`
- Datenmodell fuer `availability_slots` und `daily_status`
- klare Feldnamen fuer `display_name`, `timezone`, Slot-Zeiten und Statuswerte

Risiken und Fokus
- Zeitzonen nicht unterschaetzen; der lokale Tag muss frueh sauber modelliert werden.
- Keine doppelten Freundschaften oder Requests zulassen.

Exit-Kriterien
- Signup erzeugt ein Profil.
- Ein Nutzer kann nur seine eigenen Basisdaten lesen oder schreiben.
- Das Frontend kann gegen stabile Tabellen und Statuswerte bauen.

## Sprint 2: Social Graph und Tagesverfuegbarkeit

Sprintziel
Freundschaftsflow und Tagesverfuegbarkeit funktionieren serverseitig komplett.

Backend-Umfang
- Invite-Code oder Invite-Link-Flow implementieren.
- Erstellen, Annehmen und Ablehnen von Freundschaftsanfragen serverseitig absichern.
- Verhindern von Duplicate Requests und Duplicate Friendships.
- Endpunkte oder Edge Functions fuer Slot anlegen, aendern, loeschen.
- `Heute kann ich nicht` als `daily_status` umsetzen.
- Prioritaetsregel festschreiben: `unavailable` uebersteuert vorhandene Slots.

Deliverables
- Edge Functions oder RPCs fuer Invite-Erzeugung und Invite-Annahme
- Edge Functions oder RPCs fuer Availability und Daily Status
- Testfaelle fuer gueltige und ungueltige Slots
- dokumentierte Statuswerte fuer Freundschaften und Tagesstatus

Frontend-Handoff
- Requests und Responses fuer Invite-Erzeugung, Invite-Annahme, Slot-Speicherung und Tagesstatus
- Fehlercodes fuer typische UI-Faelle, zum Beispiel "Code ungueltig", "Slot zu kurz", "bereits befreundet"
- Realtime-Entscheidung: ob Freundschafts- oder Statusaenderungen live gepusht werden oder zunaechst per Polling kommen

Risiken und Fokus
- Invite-Flow braucht defensive Regeln gegen Spam.
- Slot-Validierung darf nicht nur im Frontend liegen.

Exit-Kriterien
- Zwei Nutzer koennen zu bestaetigten Freunden werden.
- Ein Nutzer kann sich fuer heute verfuegbar oder unavailable setzen.
- Das Frontend kann den kompletten Tagesstatus-Flow bauen, ohne Backend-Workarounds.

## Sprint 3: Matching, Expiry und Match-Status

Sprintziel
Das Kernverhalten der App funktioniert: passende Freunde werden zufaellig gematched und koennen reagieren.

Backend-Umfang
- Matching-Regeln als sichere Backend-Funktion implementieren.
- Zufallsauswahl aus allen eligible Freunden einbauen.
- Schutz vor aktiven Doppel-Matches pro Tag.
- Match-Erzeugung beim Speichern eines Slots anstossen.
- periodischen Sweeper fuer offene Matching-Faelle und Expiry umsetzen
- Match-Responses `accept` und `decline` serverseitig fuehren
- Realtime-Updates fuer Match-Status bereitstellen

Deliverables
- Matching-Function mit Testmatrix
- Job oder Scheduler-Konzept fuer Sweeper und Expiry
- Statusmodell fuer `pending`, `accepted`, `declined`, `expired`, `completed`, `missed`
- Beispiel-Payloads fuer Match-Liste und Match-Details

Frontend-Handoff
- finaler Match-Contract
- klare Regeln, wann Match-Karten erscheinen oder verschwinden
- Realtime-Events oder Polling-Strategie fuer neue Matches und Statuswechsel

Risiken und Fokus
- Race Conditions beim gleichzeitigen Matching muessen verhindert werden.
- Expiry darf nicht zu Ghost-Matches oder doppelten Calls fuehren.

Exit-Kriterien
- Aus zwei verfuegbaren Freunden kann serverseitig ein valides `pending` Match entstehen.
- Beide Nutzer koennen reagieren.
- Statuswechsel sind fuer das Frontend konsistent sichtbar.

## Sprint 4: Calls, Streaks und Hardening

Sprintziel
Akzeptierte Matches fuehren in einen sicheren Call, und das System ist bereit fuer erste echte Tests.

Backend-Umfang
- serverseitige Call-Provider-Abstraktion anlegen
- Daily als ersten Provider integrieren
- `call_sessions` und `call_participants` produktiv nutzen
- Join-Tokens nur fuer Match-Teilnehmer ausstellen
- Call-Abschluss und `completed` oder `missed` serverseitig fuehren
- Streak-Regeln umsetzen
- Rate Limits, Logging und minimale Observability ergaenzen

Deliverables
- Daily-Integration ueber Edge Functions oder sicheren Serverpfad
- abgesicherte Token-Ausgabe fuer Join-Flow
- serverseitige Streak-Aktualisierung
- Launch-Checklist fuer Env Vars, Secrets, RLS und Smoke Tests

Frontend-Handoff
- Join-Flow fuer Call-Screen
- Status, wann ein Call gestartet, aktiv, beendet oder verpasst ist
- Daten fuer Streak-Anzeige und Tagesergebnis

Risiken und Fokus
- Kein Provider-Secret im Frontend.
- Join-Tokens kurzlebig halten.
- Fehler bei Room-Erstellung muessen saubere Fallbacks haben.

Exit-Kriterien
- Ein akzeptiertes Match kann in genau einen Call uebergehen.
- Nur Teilnehmer koennen Join-Infos erhalten.
- Streak und Tagesergebnis werden serverseitig korrekt berechnet.

## Woechentliche Routine

Montag
- Sprintziel bestaetigen
- offene Architekturfragen fuer die Woche schliessen
- Contracts fuer das Frontend fixieren

Mittwoch
- kurzer Backend-Checkpoint
- Test der echten Payloads mit dem Frontend
- Risiken fuer RLS, Matching oder Provider-Integration frueh eskalieren

Freitag
- Demo mit echten Requests und Responses
- Contract-Aenderungen dokumentieren
- Backlog fuer den naechsten Sprint bereinigen

## Empfohlene Reihenfolge innerhalb des Backends

1. Datenmodell
2. RLS
3. Edge Functions oder RPCs fuer Write-Flows
4. Matching
5. Realtime
6. Call-Provider
7. Streaks und Hardening

## Konkrete Tickets fuer deinen Start

Wenn du direkt loslegen willst, wuerde ich diese drei Backend-Tickets zuerst ziehen:

1. Supabase-Migrationen fuer Core-Tabellen und Constraints
2. RLS-Policies fuer Profile, Friend Requests, Friendships und Availability
3. Profil-Bootstrap nach Signup inklusive minimaler Backend-Doku

