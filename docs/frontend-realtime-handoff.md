# Frontend Realtime Handoff

Dieses Dokument beschreibt den empfohlenen Realtime-Ansatz fuer den aktuellen Backend-Stand.
Ziel: Neue Friend Requests, Matches und Match-Responses sollen im Frontend ohne manuelles Polling sichtbar werden.

## Betroffene Tabellen

- `public.friend_requests`
- `public.matches`
- `public.match_responses`

Diese Tabellen sind fuer Supabase Realtime vorbereitet.
Die eigentliche Publication-Anbindung liegt in:

- [supabase/migrations/20260604180000_supabase_realtime_bridge.sql](/Users/simon/Desktop/Popeye/Team-Popeye/supabase/migrations/20260604180000_supabase_realtime_bridge.sql:1)

## Empfohlene Frontend-Subscriptions

### 1. Friend Requests

Nutzen fuer die UI
- neue eingehende Anfrage anzeigen
- Statuswechsel `accepted`, `declined`, `cancelled` live darstellen

### 2. Matches

Nutzen fuer die UI
- neues `pending` Match direkt anzeigen
- Wechsel nach `accepted`, `declined`, `expired` live darstellen

### 3. Match Responses

Nutzen fuer die UI
- sehen, ob die andere Person schon angenommen oder abgelehnt hat
- Match-Karte feiner aktualisieren, ohne auf den finalen `matches`-Status zu warten

## Empfohlenes Verhalten im Frontend

1. Nach Login Realtime-Subscriptions aufbauen
2. Nach Logout alle Channels sauber abbauen
3. Bei jedem Realtime-Event lokale Query oder Store-Daten aktualisieren
4. Nach kritischen Writes zusaetzlich einmal refetchen, damit ihr nicht nur auf Event-Lieferung vertraut

## Beispiel mit `supabase-js`

```ts
const channel = supabase
  .channel("catchup-live")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "matches",
    },
    (payload) => {
      console.log("match update", payload)
    },
  )
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "match_responses",
    },
    (payload) => {
      console.log("match response update", payload)
    },
  )
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "friend_requests",
    },
    (payload) => {
      console.log("friend request update", payload)
    },
  )
  .subscribe()
```

## Empfehlung fuer Query-Neuladen

Auch mit Realtime sollte das Frontend nach diesen Aktionen zusaetzlich einmal neu laden:

- Slot gesetzt oder geaendert
- `Heute kann ich nicht`
- Friend Request erstellt
- Friend Request angenommen oder abgelehnt
- Match akzeptiert oder abgelehnt

Das macht euch robuster gegen spaete oder verpasste Events.

## Falls Realtime noch nicht aktiv ist

Dann funktioniert die App weiterhin.
In dem Fall sollte das Frontend nach Writes explizit neu laden oder kurz pollen.

