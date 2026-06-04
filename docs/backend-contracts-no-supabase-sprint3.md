# Catchup Backend Contracts ohne Supabase, Sprint 3

Stand: `4. Juni 2026`

Diese Sprint-3-Ergaenzung baut auf [docs/backend-contracts-no-supabase-sprint2.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-contracts-no-supabase-sprint2.md:1) auf.

## Matches

Alle Match-Endpunkte benoetigen `Authorization: Bearer <token>`.

## `GET /matches`

Optionale Query-Parameter:

- `status`
- `localDay`

Beispiel:

`GET /matches?localDay=2026-06-06`

Liefert:

```json
{
  "matches": [
    {
      "id": "uuid",
      "localDay": "2026-06-06",
      "status": "pending",
      "overlapStartsAt": "2026-06-06T16:10:00.000Z",
      "overlapEndsAt": "2026-06-06T16:30:00.000Z",
      "expiresAt": "2026-06-04T12:21:11.339Z",
      "acceptedAt": null,
      "declinedAt": null,
      "cancelledAt": null,
      "completedAt": null,
      "createdAt": "2026-06-04T12:06:11.339Z",
      "updatedAt": "2026-06-04T12:06:11.339Z",
      "counterpart": {
        "id": "uuid",
        "displayName": "Match Bob",
        "timezone": "Europe/Berlin",
        "avatarUrl": null
      },
      "myResponse": {
        "response": "pending",
        "respondedAt": null
      },
      "counterpartResponse": {
        "response": "pending",
        "respondedAt": null
      }
    }
  ]
}
```

Erlaubte `status`-Werte:

- `pending`
- `accepted`
- `declined`
- `expired`
- `completed`
- `cancelled`
- `missed`

## `GET /matches/:matchId`

Liefert:

```json
{
  "match": {
    "...": "..."
  }
}
```

Wichtiger Fehlercode:

- `match_not_found`

## `POST /matches/attempt`

Dieser Endpunkt ist optional, aber nuetzlich fuer einen manuellen Retry aus dem Frontend oder fuer Debugging.

Body:

```json
{
  "localDay": "2026-06-06",
  "expiresInMinutes": 15
}
```

Liefert:

```json
{
  "match": null
}
```

oder bei Erfolg:

```json
{
  "match": {
    "...": "..."
  }
}
```

Wichtige Fehlercodes:

- `invalid_local_day`
- `invalid_match_expiry_minutes`

## `POST /matches/:matchId/respond`

Body:

```json
{
  "response": "accept"
}
```

Erlaubte Werte:

- `accept`
- `decline`

Beispielverhalten:

- Nach dem ersten `accept` bleibt der Match oft noch `pending`
- Wenn beide Seiten `accept` gesendet haben, wird der Match `accepted`
- Wenn eine Seite `decline` sendet, wird der Match `declined`

Wichtige Fehlercodes:

- `match_not_found`
- `match_not_pending`
- `invalid_match_response`

## Realtime-Hinweise

Aktuell gibt es im SSE-Stream jetzt zusaetzlich:

- `matches.changed`

Empfehlung fuer das Frontend:

- Nach `matches.changed` einfach `/matches` refetchen
- Nach eigenem Slot-Save ebenfalls `/matches?localDay=<day>` refetchen, selbst wenn gerade kein SSE aktiv ist

## Wichtig fuer den UI-Flow

- Ein Match wird serverseitig beim Setzen eines Slots automatisch versucht
- Die Ueberschneidung muss mindestens `5 Minuten` lang sein
- Ein Nutzer kann pro `localDay` nur einen aktiven Match haben
- `dailyStatus` blockiert Match-Kandidaten fuer denselben Tag
