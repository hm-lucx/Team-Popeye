# Catchup Frontend Handoff

Stand: `4. Juni 2026`

Dieses Dokument ist die praktische Uebergabe fuer das Frontend auf Basis des aktuellen Backend-Stands ohne Supabase.

## Backend-Base

- lokale API: `http://127.0.0.1:3001`
- Health: `GET /health`
- aktueller Auth-Mechanismus:
  - `accessToken` kommt im Response-Body
  - `refreshToken` liegt in einem `httpOnly` Cookie

## Wichtig fuer den Frontend-Client

- normale API-Requests:
  - `Authorization: Bearer <accessToken>`
  - bei Requests mit Cookies immer `credentials: 'include'`
- Refresh-Flow:
  - wenn ein Request `401` liefert, `POST /auth/refresh` mit `credentials: 'include'`
  - neuen `accessToken` speichern
  - urspruenglichen Request einmal wiederholen
- Logout:
  - `POST /auth/logout`
  - lokalen `accessToken` loeschen

## Wichtige Produkt-Screens

### 1. Auth

Verwendete Endpunkte:

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

Lokale Client-States:

- `anonymous`
- `authenticating`
- `authenticated`
- `refreshing`

### 2. Home / Dashboard

Verwendete Endpunkte:

- `GET /streaks/me`
- `GET /matches?localDay=<day>`
- `GET /availability/me?from=<day>&to=<day>`

Empfohlene Anzeige:

- aktueller Streak
- naechstes Milestone-Ziel
- heutiger Status aus `streak.today.status`
- aktueller Match fuer den Tag
- eigener Slot oder `skipped` / `unavailable`

### 3. Freunde

Verwendete Endpunkte:

- `GET /social/friends`
- `GET /social/friend-requests`
- `POST /social/friend-requests`
- `POST /social/friend-requests/:requestId/respond`
- `POST /social/friend-requests/:requestId/cancel`

Empfohlene UI-Bloecke:

- `InviteCodeCard`
- `IncomingRequestsList`
- `OutgoingRequestsList`
- `FriendsList`

### 4. Verfuegbarkeit

Verwendete Endpunkte:

- `GET /availability/me?from=<day>&to=<day>`
- `PUT /availability/slots/:localDay`
- `DELETE /availability/slots/:localDay`
- `PUT /availability/status/:localDay`
- `DELETE /availability/status/:localDay`

Wichtige Regel:

- Slot und `dailyStatus` schliessen sich serverseitig gegenseitig aus

Empfohlene UI-Regeln:

- nach Slot-Save direkt `availability` und `matches` neu laden
- nach `Heute kann ich nicht` ebenfalls `availability`, `matches` und `streaks` neu laden

### 5. Matches

Verwendete Endpunkte:

- `GET /matches`
- `GET /matches/:matchId`
- `POST /matches/:matchId/respond`

Wichtige Match-Status:

- `pending`
- `accepted`
- `declined`
- `expired`
- `completed`
- `missed`

UI-Regeln:

- `pending`: Accept / Decline Buttons
- `accepted`: Call CTA zeigen
- `completed`: Ergebnis + Streak refresh
- `missed`: als verpasster Catchup sichtbar machen

### 6. Call-Screen

Verwendete Endpunkte:

- `GET /calls/matches/:matchId`
- `POST /calls/matches/:matchId/join`
- `POST /calls/sessions/:callSessionId/events`

Empfohlener Ablauf:

1. Match ist `accepted`
2. `GET /calls/matches/:matchId`
3. wenn `callSession = null`, `POST /calls/matches/:matchId/join`
4. Join-URL oeffnen oder in eurem Web-View nutzen
5. bei Eintritt `POST /calls/sessions/:callSessionId/events` mit `joined`
6. beim Verlassen `POST /calls/sessions/:callSessionId/events` mit `left`

Wichtige Regel:

- lokal ist der Provider derzeit `mock`
- spaeter kann der gleiche Flow mit `Daily` weiterverwendet werden

## Realtime

Endpoint:

- `GET /realtime/stream`

Aktuelle Events:

- `ready`
- `friend_requests.changed`
- `matches.changed`
- `calls.changed`
- `streaks.changed`

## Wichtiger technischer Hinweis zu SSE

Der SSE-Endpoint erwartet aktuell `Authorization: Bearer <accessToken>`.

Deshalb fuer Browser-Frontend bitte **kein natives `EventSource` mit Standard-Setup** verwenden, sondern einen kleinen `fetch`-basierten SSE-Client, damit ihr den Header mitschicken koennt.

Empfohlenes Verhalten:

- Stream nach Login aufbauen
- bei Token-Refresh Stream mit neuem Token neu aufbauen
- bei Logout Stream sauber abbrechen

## Empfohlene Refetch-Strategie

Auch mit Realtime bitte nach kritischen Writes aktiv refetchen:

- nach Friend Request Create / Accept / Decline / Cancel:
  - `/social/friend-requests`
  - `/social/friends`
- nach Slot-Write oder Daily-Status:
  - `/availability/me`
  - `/matches?localDay=<day>`
  - `/streaks/me`
- nach Match-Response:
  - `/matches`
  - `/streaks/me`
- nach Call-Join oder Call-Ende:
  - `/calls/matches/:matchId`
  - `/matches/:matchId`
  - `/streaks/me`

## Sinnvolle Frontend Query Keys

- `auth.me`
- `social.friendRequests`
- `social.friends`
- `availability.range.<from>.<to>`
- `matches.list.<status>.<localDay>`
- `matches.detail.<matchId>`
- `calls.match.<matchId>`
- `streaks.me.<localDay>`

## Erste Frontend-Prioritaet

Wenn dein Kollege schnell loslegen will, ist diese Reihenfolge am sinnvollsten:

1. Auth
2. Dashboard mit `streaks` + heutigem Match
3. Freunde / Invite-Code
4. Availability + `Heute kann ich nicht`
5. Match-Karten
6. Call-Screen
7. Realtime
