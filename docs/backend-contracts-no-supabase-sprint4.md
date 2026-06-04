# Catchup Backend Contracts ohne Supabase, Sprint 4

Stand: `4. Juni 2026`

Diese Sprint-4-Ergaenzung baut auf [docs/backend-contracts-no-supabase-sprint3.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-contracts-no-supabase-sprint3.md:1) auf.

## Calls

Alle Call-Endpunkte benoetigen `Authorization: Bearer <token>`.

Lokal laeuft der Backend-Standard derzeit mit `CALL_PROVIDER=mock`. Dadurch koennen Frontend und Backend den kompletten Flow ohne externen Video-Anbieter testen.

## `GET /calls/matches/:matchId`

Verhalten:

- bei `accepted` Match ohne erzeugte Call-Session:

```json
{
  "callSession": null
}
```

- sobald eine Session existiert:

```json
{
  "callSession": {
    "id": "uuid",
    "matchId": "uuid",
    "provider": "mock",
    "providerRoomId": "catchup_abc123",
    "roomUrl": "http://127.0.0.1:3001/mock/calls/catchup_abc123",
    "status": "scheduled",
    "roomExpiresAt": "2026-06-04T13:56:12.000Z",
    "startedAt": null,
    "endedAt": null,
    "createdAt": "2026-06-04T12:26:12.000Z",
    "updatedAt": "2026-06-04T12:26:12.000Z",
    "metadata": {
      "mock": true,
      "matchId": "uuid",
      "roomName": "catchup_abc123"
    },
    "participants": [
      {
        "id": "uuid",
        "userId": "uuid",
        "displayName": "Alice",
        "avatarUrl": null,
        "timezone": "Europe/Berlin",
        "status": "token_issued",
        "providerParticipantId": "mock-user-1",
        "tokenExpiresAt": "2026-06-04T12:56:12.000Z",
        "joinedAt": null,
        "leftAt": null,
        "createdAt": "2026-06-04T12:26:12.000Z",
        "updatedAt": "2026-06-04T12:26:12.000Z"
      }
    ]
  }
}
```

Wichtige Fehlercodes:

- `match_not_found`
- `call_not_ready`
- `call_session_not_found`

## `POST /calls/matches/:matchId/join`

Dieser Endpunkt erzeugt bei Bedarf die Call-Session und liefert Join-Daten fuer den aktuellen User.

Response:

```json
{
  "callSession": {
    "...": "..."
  },
  "join": {
    "url": "http://127.0.0.1:3001/mock/calls/catchup_abc123",
    "token": "mock-token-abc",
    "tokenExpiresAt": "2026-06-04T12:56:12.000Z"
  }
}
```

Wichtige Fehlercodes:

- `match_not_found`
- `match_not_accepted`
- `call_session_closed`
- `call_participant_not_found`

## `POST /calls/sessions/:callSessionId/events`

Body:

```json
{
  "event": "joined"
}
```

Erlaubte Werte:

- `joined`
- `left`

Verhalten:

- beim ersten `joined` bleibt die Session meist `scheduled` oder wird `active`, je nach aktuellem Zustand
- sobald mindestens ein Teilnehmer wirklich drin ist, soll das Frontend die aktive Session anzeigen
- wenn beide Teilnehmer `left` gemeldet haben, geht die Session auf `ended`
- wenn beide Teilnehmer die Session verlassen haben, geht der Match auf `completed`

Wichtige Fehlercodes:

- `call_session_not_found`
- `match_not_found`
- `call_participant_not_found`
- `invalid_call_event`

## Realtime-Hinweise

Aktuell gibt es im SSE-Stream zusaetzlich:

- `calls.changed`

Empfehlung fuer das Frontend:

- nach `calls.changed` die aktuelle Session ueber `GET /calls/matches/:matchId` neu laden
- nach erfolgreichem `join` direkt den aktuellen Session-Stand lokal uebernehmen
- wenn Realtime gerade nicht verbunden ist, bei sichtbarem Call-Screen regelmaessig refetchen

## Wichtige UI-Regeln

- Der Call-Button sollte erst sichtbar oder aktiv werden, wenn der Match `accepted` ist.
- Vor dem ersten Join kann `GET /calls/matches/:matchId` bewusst `callSession: null` liefern.
- Eine `completed` Match-Ansicht darf die beendete Call-Session weiterhin lesen.
- Lokale Entwicklung laeuft derzeit gegen den `mock`-Provider, nicht gegen echten Video-Traffic.
