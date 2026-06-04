# Catchup Frontend Realtime und Device-Test

Stand: `4. Juni 2026`

## Was jetzt schon eingebaut ist

- Auth-Gate mit Session-Refresh
- API-Client gegen das lokale Backend
- Realtime-Stream gegen `GET /realtime/stream`
- automatische Refetches bei:
  - `friend_requests.changed`
  - `matches.changed`
  - `calls.changed`
  - `streaks.changed`

## 1. Backend lokal starten

```bash
cd backend
npm run dev
```

Der Backend-Server hoert standardmaessig auf `0.0.0.0:3001` und ist damit im lokalen WLAN erreichbar.

## 2. Frontend fuer das richtige Geraet konfigurieren

Lege im Projektroot eine lokale Datei `.env.local` an:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3001
```

Welche URL du nimmst:

- `iOS Simulator`: `http://127.0.0.1:3001`
- `Android Emulator`: `http://10.0.2.2:3001`
- `echtes iPhone` oder `echtes Android`: `http://<DEINE-LAN-IP>:3001`

Beispiel:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.178.42:3001
```

Die Geraete muessen im selben WLAN sein wie dein Rechner.

## 3. Eigene LAN-IP finden

Beispiele auf macOS:

```bash
ipconfig getifaddr en0
```

Falls du ueber ein anderes Interface im WLAN haengst:

```bash
ifconfig
```

## 4. Expo starten

```bash
npm start
```

Danach:

- `iOS Simulator` oder `Android Emulator` direkt starten
- oder Expo Go auf zwei echten Geraeten oeffnen und den QR-Code scannen

## 5. Erwartete Realtime-Signale in der App

Die wichtigsten Screens zeigen jetzt den Realtime-Status an:

- Home
- Freunde
- Profil
- Verlauf

Erwartete Werte:

- `connecting`
- `open`
- `reconnecting`
- `error`

Wenn `error` erscheint, sollte die App automatisch neu verbinden. Auf dem Home-Screen gibt es zusaetzlich einen manuellen `Neu verbinden`-Button.

## 6. Empfohlener 2-Geraete-Test

### Test A: Freundschaft

1. Auf beiden Geraeten jeweils registrieren.
2. Auf Geraet A den Invite-Code aus `Freunde` kopieren.
3. Auf Geraet B den Code eingeben und Anfrage senden.
4. Auf Geraet A sollte die eingehende Anfrage ohne manuellen Pull-to-refresh sichtbar werden.
5. Anfrage annehmen.
6. Auf beiden Geraeten sollte die Friends-Liste aktualisiert sein.

### Test B: Availability und Match

1. Auf beiden Geraeten in `Profil` denselben Preset-Slot setzen, zum Beispiel `18:00 - 18:30`.
2. Auf dem Home-Screen sollte ein `pending` Match auftauchen.
3. Auf beiden Geraeten annehmen.
4. Der Match-Status sollte auf `accepted` springen.

### Test C: Call

1. Auf beiden Geraeten `Call starten`.
2. Der Mock-Call-Status sollte auf beiden Geraeten sichtbar werden.
3. Auf beiden Geraeten wieder verlassen.
4. Verlauf und Home sollten sich entsprechend aktualisieren.

### Test D: Tagesstatus

1. Auf einem Geraet `Heute nicht` setzen.
2. Der Slot fuer denselben Tag sollte verschwinden.
3. Home und Profil sollten den Tagesstatus korrekt zeigen.

## 7. Wenn auf echten Geraeten etwas nicht geht

Pruefe zuerst:

- Backend laeuft wirklich
- richtige LAN-IP in `.env.local`
- beide Geraete im selben WLAN
- Port `3001` wird nicht von Firewall oder VPN blockiert

Hilfreich ist dann:

```bash
curl http://<DEINE-LAN-IP>:3001/health
```

Wenn `/health` von deinem Rechner aus geht, aber nicht vom Handy, ist es fast immer ein Netzwerk- oder IP-Thema und nicht das Frontend.

## 8. Was noch nicht Teil dieses Testplans ist

- echte Video-UI mit `Daily`
- Push Notifications
- Gruppen
- produktionsnahes Staging
