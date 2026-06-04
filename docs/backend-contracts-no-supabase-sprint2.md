# Catchup Backend Contracts ohne Supabase, Sprint 2

Stand: `4. Juni 2026`

Diese Endpunkte sind im lokalen Backend jetzt verfuegbar.

## Auth

### `POST /auth/signup`

Erstellt einen Nutzer und gibt `accessToken` plus `user` zurueck.

### `POST /auth/login`

Loggt einen Nutzer ein und gibt `accessToken` plus `user` zurueck.

### `GET /auth/me`

Benötigt `Authorization: Bearer <token>`.

Liefert:

- `id`
- `email`
- `displayName`
- `timezone`
- `inviteCode`
- `avatarUrl`

## Social

Alle Social-Endpunkte benoetigen `Authorization: Bearer <token>`.

### `GET /social/friend-requests`

Liefert:

```json
{
  "incoming": [],
  "outgoing": []
}
```

Jeder Request-Eintrag enthaelt:

- `id`
- `requesterId`
- `addresseeId`
- `status`
- `inviteCodeSnapshot`
- `message`
- `createdAt`
- `updatedAt`
- `respondedAt`
- `counterpart`

### `POST /social/friend-requests`

Body:

```json
{
  "inviteCode": "ABC12345",
  "message": "lass uns catchupen"
}
```

Liefert:

```json
{
  "request": {
    "...": "..."
  }
}
```

Wichtige Fehlercodes:

- `invalid_invite_code`
- `cannot_add_self`
- `already_friends`
- `pending_friend_request_exists`

### `POST /social/friend-requests/:requestId/respond`

Body:

```json
{
  "action": "accept"
}
```

Erlaubte Werte:

- `accept`
- `decline`

Wichtige Fehlercodes:

- `friend_request_not_found`
- `friend_request_not_pending`
- `forbidden`

### `POST /social/friend-requests/:requestId/cancel`

Bricht einen offenen, selbst gesendeten Request ab.

### `GET /social/friends`

Liefert:

```json
{
  "friends": [
    {
      "friendshipId": "uuid",
      "createdAt": "2026-06-04T11:58:27.970Z",
      "lastMatchedAt": null,
      "user": {
        "id": "uuid",
        "displayName": "Bob Local",
        "timezone": "Europe/Berlin",
        "avatarUrl": null
      }
    }
  ]
}
```

## Availability

Alle Availability-Endpunkte benoetigen `Authorization: Bearer <token>`.

### `GET /availability/me?from=2026-06-05&to=2026-06-05`

Liefert:

```json
{
  "slots": [],
  "dailyStatus": []
}
```

### `PUT /availability/slots/:localDay`

Beispiel:

`PUT /availability/slots/2026-06-05`

Body:

```json
{
  "timezone": "Europe/Berlin",
  "startsAt": "2026-06-05T18:00:00+02:00",
  "endsAt": "2026-06-05T18:30:00+02:00"
}
```

Liefert:

```json
{
  "slot": {
    "id": "uuid",
    "localDay": "2026-06-05",
    "timezone": "Europe/Berlin",
    "startsAt": "2026-06-05T16:00:00.000Z",
    "endsAt": "2026-06-05T16:30:00.000Z",
    "createdAt": "2026-06-04T11:58:28.193Z",
    "updatedAt": "2026-06-04T11:58:28.193Z"
  }
}
```

Wichtige Fehlercodes:

- `invalid_local_day`
- `invalid_timezone`
- `invalid_slot_datetime`
- `slot_end_must_be_after_start`
- `slot_too_short`
- `slot_start_must_match_local_day`
- `slot_end_must_match_local_day`

Wichtige Regel:

- Wenn fuer denselben Tag ein `dailyStatus` existiert, wird er beim Slot-Write serverseitig entfernt.

### `DELETE /availability/slots/:localDay`

Liefert:

```json
{
  "cleared": true
}
```

### `PUT /availability/status/:localDay`

Body:

```json
{
  "status": "unavailable",
  "reason": "busy today"
}
```

Erlaubte Statuswerte:

- `unavailable`
- `skipped`

Liefert:

```json
{
  "dailyStatus": {
    "id": "uuid",
    "localDay": "2026-06-05",
    "status": "unavailable",
    "reason": "busy today",
    "createdAt": "2026-06-04T11:58:28.367Z",
    "updatedAt": "2026-06-04T11:58:28.367Z"
  }
}
```

Wichtige Regel:

- Wenn fuer denselben Tag ein `slot` existiert, wird er beim Status-Write serverseitig entfernt.

### `DELETE /availability/status/:localDay`

Liefert:

```json
{
  "cleared": true
}
```

## Realtime

### `GET /realtime/stream`

Benötigt `Authorization: Bearer <token>`.

Aktuell gibt es bei Social-Aenderungen ein Realtime-Hinweis-Event:

- `friend_requests.changed`

Empfehlung fuer das Frontend:

- Bei `friend_requests.changed` einfach `/social/friend-requests` und bei Bedarf `/social/friends` refetchen.
