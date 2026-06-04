# Catchup Backend Contracts ohne Supabase, Sprint 5

Stand: `4. Juni 2026`

Diese Sprint-5-Ergaenzung baut auf [docs/backend-contracts-no-supabase-sprint4.md](/Users/simon/Desktop/Popeye/Team-Popeye/docs/backend-contracts-no-supabase-sprint4.md:1) auf.

## Streaks

Alle Streak-Endpunkte benoetigen `Authorization: Bearer <token>`.

## `GET /streaks/me`

Optionaler Query-Parameter:

- `localDay`

Wenn `localDay` fehlt, leitet das Backend den Tag aus dem Profil-`timezone` des Users ab.

Beispiel:

`GET /streaks/me?localDay=2026-06-09`

Response:

```json
{
  "streak": {
    "currentStreak": 2,
    "longestStreak": 2,
    "lastCompletedLocalDay": "2026-06-09",
    "nextMilestone": 3,
    "today": {
      "localDay": "2026-06-09",
      "timezone": "Europe/Berlin",
      "status": "completed",
      "hasAvailabilitySlot": false,
      "dailyStatus": null,
      "matchId": "uuid"
    }
  }
}
```

Moegliche `today.status`-Werte:

- `idle`
- `available`
- `unavailable`
- `skipped`
- `pending`
- `accepted`
- `declined`
- `expired`
- `completed`
- `cancelled`
- `missed`

Wichtige Fehlercodes:

- `streak_not_found`
- `invalid_local_day`

## Streak-Regeln im MVP

- Ein Streak-Punkt entsteht nur bei `match.status = completed`.
- `skipped` und `unavailable` sind neutrale Tage und brechen die Streak nicht automatisch.
- Ein normaler Leertag ohne `completed` oder neutralen Tagesstatus bricht die Streak.
- `declined`, `expired` und `missed` erhoehen die Streak nicht.

## Maintenance-Verhalten

Das Backend hat jetzt einen portablen Maintenance-Sweep fuer nachlaufende Zustandswechsel.

Er erledigt:

- `pending -> expired`, wenn `expires_at` erreicht ist
- `accepted -> missed`, wenn das Match-Fenster vorbei ist und nicht beide gejoint haben
- `accepted -> completed`, wenn beide gejoint haben, der Call aber nicht sauber ueber `left` beendet wurde

## Realtime-Hinweise

Aktuell gibt es im SSE-Stream zusaetzlich:

- `streaks.changed`

Empfehlung fuer das Frontend:

- nach `streaks.changed` einfach `GET /streaks/me` refetchen
- nach einer `completed` Match-Ansicht ebenfalls die Streak-Daten neu laden

## Rate-Limit-Hinweise

Kritische Write-Pfade sind jetzt defensiv begrenzt:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /social/friend-requests`
- `POST /social/friend-requests/:requestId/respond`
- `POST /social/friend-requests/:requestId/cancel`
- `POST /matches/attempt`
- `POST /calls/matches/:matchId/join`

Die aktuelle Implementierung ist bewusst leichtgewichtig und in-memory. Fuer mehrere App-Instanzen sollte spaeter eine zentrale Variante nachgezogen werden.
