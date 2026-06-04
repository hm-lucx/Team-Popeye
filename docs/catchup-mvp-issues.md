# Catchup MVP: priorisierte Issue-Liste

Diese Liste verdichtet die bisherigen Ideen zu einem umsetzbaren MVP-Backlog.
Zielbild: Eine Person setzt fuer heute einen Zeitslot, wird mit einem bestaetigten Freund mit ueberlappendem Slot gematched und kann einen 5-Minuten-Call annehmen.

## Produktentscheidungen, die frueh festgezogen werden sollten

1. Tageslogik
Empfehlung: Der "heutige" Tag richtet sich nach der im Profil gespeicherten Nutzer-Zeitzone, nicht nach UTC.

2. Matching-Trigger
Empfehlung: Matching laeuft beim Speichern eines Slots und zusaetzlich periodisch als Sweeper, damit keine Person haengen bleibt.

3. Streak-Regel
Empfehlung: Eine Streak steigt nur bei `completed`, nicht schon bei `accepted`.

4. Call-Typ
Empfehlung: Audio-only im MVP.

5. Benachrichtigungen
Empfehlung: Im MVP mindestens Realtime/In-App; Push kann als spaeteres Upgrade kommen.

## P0: Fundament

### Issue 1: Projektbasis konsolidieren und aktuellen Stand dokumentieren
Labels: `architecture`, `docs`, `setup`, `mvp`

Ziel
Den aktuellen Frontend-, Backend- und Supabase-Stand an einer Stelle zusammenziehen, damit die weitere Arbeit auf einer stabilen Basis aufsetzt.

Akzeptanzkriterien
- Der aktuelle App-Stand liegt im Repository oder ist im Repo eindeutig verlinkt.
- Eine Datei `docs/current-state.md` beschreibt Seiten, Komponenten, Auth-Flows, Datenmodell und bekannte Luecken.
- Lokale Startanleitung und benoetigte Environment-Variablen sind dokumentiert.
- Es ist klar, welche Teile bereits produktiv funktionieren und welche nur Mockups oder Platzhalter sind.

### Issue 2: Core-Datenmodell und Migrationen fuer den MVP anlegen
Labels: `database`, `backend`, `mvp`

Ziel
Ein schlankes, sauberes Datenmodell fuer Profile, Freundschaften, Verfuegbarkeit, Matches, Calls und Streaks schaffen.

Empfohlene Tabellen
- `profiles`
- `friend_requests`
- `friendships`
- `availability_slots`
- `daily_status`
- `matches`
- `match_responses`
- `call_sessions`
- `call_participants`
- `streaks`

Akzeptanzkriterien
- Alle Tabellen sind als nachvollziehbare Migrationen angelegt.
- `profiles.id` referenziert direkt `auth.users.id`.
- Alle Foreign Keys, Unique Constraints und sinnvollen Indexe sind vorhanden.
- Zeitbezogene Felder sind UTC-basiert; Nutzer-Zeitzone liegt im Profil.
- Pro Nutzer ist hoechstens ein aktiver Availability-Slot pro lokalem Tag erlaubt.
- Pro Nutzer ist hoechstens ein aktives Match pro lokalem Tag erlaubt.

### Issue 3: RLS und serverseitige Schreibpfade fuer kritische Aktionen absichern
Labels: `security`, `database`, `backend`, `mvp`

Ziel
Sicherstellen, dass Nutzer nur eigene oder fuer sie relevante Daten sehen und veraendern koennen.

Akzeptanzkriterien
- RLS ist fuer alle MVP-Tabellen aktiviert.
- Nutzer koennen nur ihr eigenes Profil bearbeiten.
- Nutzer koennen nur eigene Availability-Slots und Daily-Status-Eintraege lesen und veraendern.
- Nutzer koennen nur Freundschaften, Requests, Matches und Call-Sessions sehen, an denen sie beteiligt sind.
- Kritische Schreiboperationen wie Matching, Call-Erstellung und Streak-Updates laufen nur ueber Backend oder Edge Functions.
- Provider-Secrets sind ausschliesslich serverseitig verfuegbar.

## P1: Kern-User-Flow

### Issue 4: Auth, Profil-Bootstrap und Basis-Onboarding umsetzen
Labels: `frontend`, `backend`, `auth`, `mvp`

Ziel
Nach Signup oder Login soll jede Person ein vollstaendiges Profil besitzen und die App sinnvoll betreten koennen.

Akzeptanzkriterien
- Nach erfolgreicher Registrierung existiert automatisch ein `profiles`-Eintrag.
- Das Profil enthaelt mindestens `display_name`, `timezone` und optional `avatar_url`.
- Fehlende Profile werden robust nacherzeugt oder als klarer Fehler behandelt.
- Nutzer koennen ihren Anzeigenamen spaeter aendern.
- Die App blockiert Core-Flows, solange kein gueltiges Profil vorhanden ist.

### Issue 5: Freund*innen per Invite-Link oder Code hinzufuegen
Labels: `frontend`, `backend`, `friends`, `mvp`

Ziel
Nutzer sollen bestaetigte Freundschaften aufbauen koennen, ohne ihr gesamtes Telefonbuch hochzuladen.

Akzeptanzkriterien
- Nutzer koennen einen Invite-Link oder Invite-Code erzeugen.
- Andere Nutzer koennen damit eine Freundschaftsanfrage erstellen.
- Requests koennen angenommen oder abgelehnt werden.
- Es entstehen keine doppelten Requests oder doppelten Freundschaften.
- Blockierte oder zuvor abgelehnte Beziehungen werden nicht stillschweigend neu angelegt.
- Nur bestaetigte Freundschaften sind spaeter matching-berechtigt.

### Issue 6: Verfuegbarkeit fuer heute setzen und "Heute kann ich nicht" abbilden
Labels: `frontend`, `backend`, `availability`, `mvp`

Ziel
Der Nutzer soll fuer den aktuellen lokalen Tag entweder einen Zeitslot setzen oder sich bewusst abmelden koennen.

Akzeptanzkriterien
- Nutzer koennen einen Start- und Endzeitpunkt fuer heute setzen.
- Ein Slot muss mindestens 5 Minuten lang sein.
- Ein bestehender Slot kann aktualisiert oder geloescht werden.
- Der Button "Heute kann ich nicht" setzt `daily_status` fuer den aktuellen Tag auf `unavailable` oder `skipped`.
- `daily_status = unavailable` hat Vorrang vor einem vorhandenen Slot.
- Die UI zeigt nach Reload eindeutig, ob die Person verfuegbar, abgemeldet oder noch unentschieden ist.

## P2: Matching und Match-Lebenszyklus

### Issue 7: Matching-Regeln fachlich fixieren und als sichere Backend-Funktion implementieren
Labels: `backend`, `matching`, `mvp`

Ziel
Die zentrale Matching-Logik soll nachvollziehbar, testbar und unabhaengig vom Frontend funktionieren.

Empfohlene Regeln
- Nur bestaetigte Freunde sind eligible.
- Beide Nutzer muessen fuer denselben lokalen Tag verfuegbar sein.
- Die Slots muessen sich mindestens 5 Minuten ueberschneiden.
- Nutzer mit `daily_status = unavailable` werden ausgeschlossen.
- Eine Person darf nicht mit sich selbst gematched werden.
- Pro Nutzer nur ein aktives Match pro Tag.
- Auswahl ist zufaellig aus allen eligible Freunden.
- Wenn moeglich, werden zuletzt gematchte Freunde temporaer benachteiligt, damit Abwechslung entsteht.

Akzeptanzkriterien
- Matching kann serverseitig fuer einen Nutzer oder als Batch angestossen werden.
- Ein Match wird nur erstellt, wenn alle Regeln erfuellt sind.
- Doppelte aktive Matches werden technisch verhindert.
- Das Match startet im Status `pending`.
- Die Logik ist durch automatisierte Tests fuer Ueberlappung, Ausschluesse und Duplicate-Prevention abgesichert.

### Issue 8: Match-Trigger, Expiry und Realtime-Updates umsetzen
Labels: `backend`, `frontend`, `matching`, `realtime`, `mvp`

Ziel
Ein Match soll zur richtigen Zeit entstehen, sichtbar werden und nicht unbegrenzt offen bleiben.

Akzeptanzkriterien
- Matching wird beim Setzen oder Aendern der Verfuegbarkeit angestossen.
- Zusaetzlich existiert ein periodischer Sweeper fuer offene oder verpasste Faelle.
- Pending Matches laufen nach einer definierten Frist automatisch auf `expired`.
- Match-Status-Aenderungen sind fuer beide Teilnehmer in Echtzeit sichtbar.
- Nutzer ohne Match sehen einen klaren Empty State statt eines uneindeutigen Ladezustands.

### Issue 9: Match annehmen, ablehnen und finalen Match-Status korrekt fuehren
Labels: `frontend`, `backend`, `matching`, `mvp`

Ziel
Beide Teilnehmer sollen ein Match kontrolliert bestaetigen oder ablehnen koennen.

Akzeptanzkriterien
- Beide Teilnehmer sehen pending Matches, an denen sie beteiligt sind.
- Jeder Teilnehmer kann genau einmal `accept` oder `decline` senden.
- Lehnen Nutzer ab, wird das Match auf `declined` gesetzt.
- Stimmen beide zu, wird das Match auf `accepted` gesetzt.
- Bereits expirte oder abgeschlossene Matches koennen nicht mehr veraendert werden.
- Die UI zeigt die Zustaende `pending`, `accepted`, `declined`, `expired`, `completed` und `missed` verstaendlich an.

## P3: Calls

### Issue 10: Call-Provider-Abstraktion definieren und serverseitig anbinden
Labels: `backend`, `calls`, `architecture`, `mvp`

Ziel
Die App soll nicht hart an einen einzelnen Call-Anbieter gekoppelt sein.

Akzeptanzkriterien
- Es gibt ein klares serverseitiges Interface fuer Call-Provider.
- Der konkrete Provider kann ausgetauscht werden, ohne Frontend-Logik umzuschreiben.
- Provider-Konfiguration und API-Keys liegen nur serverseitig.
- `call_sessions` speichert Provider, Room-Referenz und Status.
- Das Frontend erhaelt nur die minimal noetigen Join-Informationen.

### Issue 11: Daily fuer 5-Minuten-Audio-Calls integrieren
Labels: `backend`, `frontend`, `calls`, `mvp`

Ziel
Nach einem akzeptierten Match soll genau ein sicherer Call-Raum fuer beide Nutzer bereitstehen.

Akzeptanzkriterien
- Fuer jedes `accepted` Match wird genau eine `call_session` erstellt.
- Der Daily-Raum wird serverseitig erzeugt.
- Join-Tokens oder room-spezifische Zugangsdaten werden pro Teilnehmer sicher ausgestellt.
- Nur Match-Teilnehmer koennen Call-Informationen abrufen.
- Der Raum ist zeitlich begrenzt und fuer den MVP auf kurze Audio-Calls ausgelegt.
- Fehler bei Room-Erstellung, Join oder Beendigung werden sauber behandelt.

## P4: Retention und Betriebsreife

### Issue 12: Tagesergebnis, Streaks und leichte Gamification umsetzen
Labels: `backend`, `frontend`, `gamification`, `mvp`

Ziel
Der taegliche Call soll Motivation erzeugen, ohne unfair oder manipulierbar zu sein.

Empfohlene MVP-Regel
- Streak zaehlt nur, wenn ein Match zustande kam und der Call als `completed` markiert wurde.
- `Heute kann ich nicht` bricht die Streak nicht automatisch, sondern zaehlt als neutraler Tag.
- `missed` oder `declined` erhoehen die Streak nicht.

Akzeptanzkriterien
- Die Regeln fuer `completed`, `missed`, `declined`, `expired` und `skipped` sind eindeutig dokumentiert.
- Streak-Werte werden serverseitig berechnet oder aktualisiert.
- Nutzer sehen aktuelle Streak, laengste Streak und den heutigen Status.
- Die Streak kann nicht durch Client-Manipulation erhoeht werden.
- Gamification bleibt leichtgewichtig und blockiert nicht den Kern-Flow.

### Issue 13: Basis-Observability, Abuse-Protection und Launch-Checks ergaenzen
Labels: `security`, `ops`, `quality`, `mvp`

Ziel
Vor einem ersten Test mit echten Nutzern sollen Missbrauch, Debugging-Luecken und stille Fehler reduziert werden.

Akzeptanzkriterien
- Kritische Backend-Aktionen schreiben strukturierte Logs.
- Invite-Erstellung, Match-Ausloesung und Token-Erzeugung sind rate-limitiert oder defensiv abgesichert.
- Fehler in Auth, Matching und Calls sind mit nachvollziehbaren Events oder Fehlercodes sichtbar.
- Minimale Analytics oder Event-Telemetrie fuer Kernschritte ist definiert.
- Es gibt eine kurze Launch-Checklist fuer Env Vars, RLS, Provider-Secrets und Smoke Tests.

## Was ich bewusst zusammengezogen habe

- Verfuegbarkeit und "Heute kann ich nicht" gehoeren in ein gemeinsames Issue, weil beide dasselbe Tagesmodell beeinflussen.
- Datenbankmodell und RLS bleiben getrennt, weil das unterschiedliche Review-Schwerpunkte hat.
- Match-Erzeugung, Match-Trigger und Match-Annahme sind drei getrennte Schritte, damit die Fachlogik nicht mit UI-Zustaenden vermischt wird.
- Streaks kommen spaeter als Matching und Calls, weil sonst zu frueh ueber Randfaelle optimiert wird.

## Empfohlene MVP-Reihenfolge

1. Issue 1 bis 3
2. Issue 4 bis 6
3. Issue 7 bis 9
4. Issue 10 bis 11
5. Issue 12 bis 13

