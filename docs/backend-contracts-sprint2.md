# Backend Contracts Sprint 2

Dieses Dokument ist der Handoff fuer das Frontend nach Sprint 2.
Ziel: Der Frontend-Flow soll gegen stabile serverseitige Contracts bauen koennen.

## 1. Edge Function `friend-invites`

Pfad
- `supabase/functions/friend-invites/index.ts`

Methode
- `POST`

Auth
- Nutzer muss eingeloggt sein.
- Der `Authorization` Header wird an die Edge Function durchgereicht.

### Aktion: Request per Invite-Code erstellen

Request

```json
{
  "action": "create",
  "inviteCode": "A1B2C3D4",
  "message": "Lass uns catch up machen"
}
```

Response `201`

```json
{
  "data": {
    "request": {
      "id": "uuid",
      "requester_id": "uuid",
      "addressee_id": "uuid",
      "status": "pending",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    },
    "addressee": {
      "id": "uuid",
      "display_name": "Alex",
      "avatar_url": null,
      "timezone": "Europe/Berlin"
    }
  }
}
```

Wichtige Fehlercodes
- `invite_not_found`
- `cannot_friend_self`
- `already_friends`
- `duplicate_request`

### Aktion: Anfrage annehmen

Request

```json
{
  "action": "accept",
  "requestId": "uuid"
}
```

Response `200`

```json
{
  "data": {
    "request": {
      "id": "uuid",
      "status": "accepted",
      "responded_at": "timestamp",
      "updated_at": "timestamp"
    },
    "friendship": {
      "id": "uuid",
      "user_one_id": "uuid",
      "user_two_id": "uuid",
      "created_from_request_id": "uuid",
      "created_at": "timestamp"
    }
  }
}
```

### Aktion: Anfrage ablehnen

Request

```json
{
  "action": "decline",
  "requestId": "uuid"
}
```

### Aktion: Anfrage abbrechen

Request

```json
{
  "action": "cancel",
  "requestId": "uuid"
}
```

## 2. Availability RPCs

Die folgenden RPCs laufen ueber `supabase.rpc(...)`.

### `upsert_my_availability_slot`

Parameter

```json
{
  "p_local_day": "2026-06-04",
  "p_timezone": "Europe/Berlin",
  "p_starts_at": "2026-06-04T16:00:00.000Z",
  "p_ends_at": "2026-06-04T16:15:00.000Z"
}
```

Verhalten
- legt den Slot an oder aktualisiert ihn
- entfernt vorhandenen `daily_status` fuer denselben Tag automatisch
- Start und Ende muessen beide auf denselben lokalen Tag fallen

### `clear_my_availability_slot`

Parameter

```json
{
  "p_local_day": "2026-06-04"
}
```

Response
- `true`, wenn ein Slot geloescht wurde
- `false`, wenn kein Slot vorhanden war

### `set_my_daily_status`

Parameter

```json
{
  "p_local_day": "2026-06-04",
  "p_status": "unavailable",
  "p_reason": "Heute keine Zeit"
}
```

Verhalten
- legt `daily_status` an oder aktualisiert ihn
- entfernt einen vorhandenen Availability-Slot fuer denselben Tag automatisch

Zulaessige Werte fuer `p_status`
- `unavailable`
- `skipped`

### `clear_my_daily_status`

Parameter

```json
{
  "p_local_day": "2026-06-04"
}
```

## 3. Direkte Reads fuer das Frontend

Mit den bestehenden RLS-Regeln kann das Frontend bereits lesen:

- eigenes `profiles`
- eigene und eingehende `friend_requests`, sofern beteiligt
- eigene `friendships`, sofern beteiligt
- eigene `availability_slots`
- eigener `daily_status`

## 4. Wichtige fachliche Regeln

- `daily_status` und `availability_slot` sind fuer denselben Tag gegenseitig exklusiv.
- Eine Freundschaft entsteht erst bei `friend_request.status = accepted`.
- Doppelte offene Friend Requests fuer dieselbe Paarung sind nicht erlaubt.
- Ein Nutzer kann sich nicht selbst adden.

