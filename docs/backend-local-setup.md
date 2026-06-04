# Catchup Lokales Backend-Setup

Stand: `4. Juni 2026`

## Was lokal bereits erledigt ist

- `PostgreSQL 16` wurde per `Homebrew` installiert
- der lokale Server wurde gestartet
- die Datenbank `catchup` wurde angelegt
- eine lokale Backend-Umgebungsdatei liegt in `backend/.env`
- die Backend-Abhaengigkeiten wurden installiert
- die Migrationen `0001` bis `0003` wurden erfolgreich angewendet
- die Health-Route wurde erfolgreich getestet
- der lokale `signup`-Flow wurde erfolgreich getestet
- der komplette Match-zu-Call-Flow wurde mit `mock`-Provider erfolgreich getestet

## Lokale Datenbankdaten

- Datenbankname: `catchup`
- lokaler User: `simon`
- Socket-Host: `/tmp`
- `DATABASE_URL`: `postgresql://simon@/catchup?host=/tmp`

## Nuetzliche Befehle

### PostgreSQL lokal starten

```bash
/usr/local/opt/postgresql@16/bin/pg_ctl -D /usr/local/var/postgresql@16 -l /private/tmp/catchup-postgres.log start
```

### PostgreSQL lokal stoppen

```bash
/usr/local/opt/postgresql@16/bin/pg_ctl -D /usr/local/var/postgresql@16 stop
```

### In die Datenbank gehen

```bash
/usr/local/opt/postgresql@16/bin/psql -d catchup
```

### Log ansehen

```bash
tail -f /private/tmp/catchup-postgres.log
```

## Naechste Schritte im Projekt

1. `Daily` mit echten Credentials anbinden und einmal live pruefen
2. Streaks und Missed-Call-Regeln sauber modellieren
3. Expiry- und Background-Jobs nachziehen
4. danach Hardening, Logging und Rate Limits

## Lokaler Backend-Start

```bash
cd backend
npm run dev
```

## Lokaler Smoke-Test

```bash
cd backend
npm run smoke:calls
```

Dieser Test prueft automatisiert:

- Signup von zwei frischen Test-Usern
- Friend Request und Accept
- ueberlappende Slots
- automatischen Match
- beidseitiges Match-Accept
- Call-Session-Erzeugung
- `joined`- und `left`-Events
- abgeschlossenen Match mit beendeter Call-Session

## Wichtiger Hinweis

`npm install` meldet aktuell `2 critical vulnerabilities` im Dependency-Tree. Ich habe den Stack trotzdem installiert, damit wir lokal arbeiten koennen, aber das sollten wir vor einem oeffentlichen Deploy bewusst pruefen.
