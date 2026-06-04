import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

// --- UMSCHALTER: false = leerer Zustand (Standard), true = mit Beispieldaten ---
const hatDaten = false;

// --- Designfarben ---
const AKZENT = '#ff5959';
const AKZENT_HELL = '#FFF0EC';
const HINTERGRUND = '#F2F2F7';
const WEISS = '#FFFFFF';
const DUNKEL = '#111827';
const GRAU = '#9CA3AF';
const GRUEN = '#22C55E';

const SCHATTEN = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};

// Verschiedene Farben für Avatare – gibt jedem Freund eine eigene Farbe
const AVATAR_FARBEN = [
  { bg: '#FFD5C8', text: '#C0392B' },
  { bg: '#C8E6FF', text: '#1A6FA8' },
  { bg: '#D5F5E3', text: '#1E7E34' },
  { bg: '#F9E4FF', text: '#7D3C98' },
  { bg: '#FFF3CD', text: '#92660A' },
];

// --- Beispieldaten (werden nur angezeigt wenn hatDaten = true) ---
const nutzerName = 'Philipp';

const matchDaten = {
  name: 'Sarah K.',
  initialen: 'SK',
  gruppe: 'Uni-Freunde',
  letzterCallText: 'Gestern',
  countdown: '00:14:32',
  avatarFarbe: AVATAR_FARBEN[0],
};

const aktivFreunde = [
  { initialen: 'LM', avatarFarbe: AVATAR_FARBEN[1] },
  { initialen: 'TK', avatarFarbe: AVATAR_FARBEN[2] },
  { initialen: 'JB', avatarFarbe: AVATAR_FARBEN[3] },
];
const gesamtFreunde = 9;
const weitereAktiv = gesamtFreunde - aktivFreunde.length;

const gruppen = [
  { emoji: '🎓', name: 'Uni-Freunde', aktiv: 4, gesamt: 6, frequenz: 'Täglich' },
  { emoji: '💼', name: 'Work-Crew', aktiv: 1, gesamt: 4, frequenz: '2×/Woche' },
  { emoji: '🏃', name: 'Sport-Gruppe', aktiv: 2, gesamt: 5, frequenz: 'Wöchentlich' },
];

const letzterCallDaten = {
  initialen: 'LM',
  name: 'Lisa M.',
  uhrzeit: '18:30',
  dauer: '12 Min',
  gruppe: 'Uni-Freunde',
  stimmung: '😄',
  avatarFarbe: AVATAR_FARBEN[1],
};

const streak = 5;

export default function HomeScreen() {
  // router erlaubt uns, programmatisch zu anderen Bildschirmen zu navigieren
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* --- 1. Kopfzeile --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>CatchUp</Text>
            <Text style={styles.greeting}>
              {hatDaten ? `Guten Morgen, ${nutzerName} 👋` : 'Willkommen 👋'}
            </Text>
          </View>
          {/* Profil-Avatar: antippbar → öffnet den Profil-Tab */}
          <Pressable onPress={() => router.push('/(tabs)/profil')}>
            <View style={styles.profilAvatar}>
              <Text style={styles.profilInitialen}>
                {nutzerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            {hatDaten && <View style={styles.onlineDot} />}
          </Pressable>
        </View>

        {/* --- 2. Dein Match heute --- */}
        <View style={styles.abschnitt}>
          <AbschnittKopf titel="Dein Match heute" />

          {hatDaten ? (
            // Gefüllter Zustand: Hervorgehobene Match-Karte
            <View style={styles.matchKarte}>
              {/* Linker Farbstreifen als Akzent */}
              <View style={styles.matchAkzentStreifen} />

              <View style={styles.matchInhalt}>
                {/* Avatar + Name + Unterzeile */}
                <View style={styles.matchKopf}>
                  <View style={[styles.avatar, styles.avatarGross, { backgroundColor: matchDaten.avatarFarbe.bg }]}>
                    <Text style={[styles.avatarTextGross, { color: matchDaten.avatarFarbe.text }]}>
                      {matchDaten.initialen}
                    </Text>
                  </View>
                  <View style={styles.matchTextBlock}>
                    <Text style={styles.matchName}>{matchDaten.name}</Text>
                    <Text style={styles.matchUnter}>
                      {matchDaten.gruppe} · Letzter Call: {matchDaten.letzterCallText}
                    </Text>
                  </View>
                </View>

                {/* Countdown-Box */}
                <View style={styles.countdownBox}>
                  <Text style={styles.countdownLabel}>bis Start</Text>
                  <Text style={styles.countdownZahl}>{matchDaten.countdown}</Text>
                </View>

                {/* Anruf-Button */}
                <Pressable style={styles.btnPrimary} onPress={() => {}}>
                  <Text style={styles.btnPrimaryText}>📞  Jetzt anrufen</Text>
                </Pressable>

                {/* Sekundär-Link */}
                <Pressable onPress={() => {}}>
                  <Text style={styles.linkText}>Andere Zeit vorschlagen</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            // Leerer Zustand
            <View style={styles.platzhalterKarte}>
              <Text style={styles.platzhalterEmoji}>🤝</Text>
              <Text style={styles.platzhalterTitel}>Noch kein Match</Text>
              <Text style={styles.platzhalterText}>
                Füge Freunde hinzu und trage deine Verfügbarkeit ein – dann findet die App ein passendes Zeitfenster.
              </Text>
              <Pressable style={styles.btnPrimary} onPress={() => {}}>
                <Text style={styles.btnPrimaryText}>Freunde hinzufügen</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* --- 3. Heute aktiv --- */}
        <View style={styles.abschnitt}>
          {/* Abschnittsüberschrift mit Badge */}
          <View style={styles.abschnittKopfZeile}>
            <Text style={styles.abschnittTitel}>Heute aktiv</Text>
            {hatDaten && (
              <View style={styles.badgeGruen}>
                <Text style={styles.badgeGruenText}>{aktivFreunde.length + weitereAktiv} online</Text>
              </View>
            )}
          </View>

          {hatDaten ? (
            // Gefüllter Zustand: Avatar-Reihe
            <View style={styles.aktivContainer}>
              <View style={styles.avatarReihe}>
                {aktivFreunde.map((freund, index) => (
                  <View
                    key={index}
                    style={[styles.avatar, { backgroundColor: freund.avatarFarbe.bg }]}
                  >
                    <Text style={[styles.avatarText, { color: freund.avatarFarbe.text }]}>
                      {freund.initialen}
                    </Text>
                  </View>
                ))}
                {/* "+N" für nicht gezeigte Freunde */}
                <View style={[styles.avatar, styles.avatarMehr]}>
                  <Text style={styles.avatarMehrText}>+{weitereAktiv}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.platzhalterKarte}>
              <Text style={styles.platzhalterText}>Noch niemand aktiv.</Text>
            </View>
          )}
        </View>

        {/* --- 4. Meine Gruppen --- */}
        <View style={styles.abschnitt}>
          <AbschnittKopf titel="Meine Gruppen" linkText={hatDaten ? 'Alle →' : undefined} />

          {hatDaten ? (
            // Gefüllter Zustand: Liste von Gruppen-Karten
            <View style={styles.gruppenListe}>
              {gruppen.map((gruppe, index) => (
                <Pressable key={index} style={styles.gruppenKarte} onPress={() => {}}>
                  {/* Emoji-Icon */}
                  <View style={styles.gruppenEmojiContainer}>
                    <Text style={styles.gruppenEmoji}>{gruppe.emoji}</Text>
                  </View>

                  {/* Name + Frequenz */}
                  <View style={styles.gruppenInfo}>
                    <Text style={styles.gruppenName}>{gruppe.name}</Text>
                    <Text style={styles.gruppenFrequenz}>{gruppe.frequenz}</Text>
                  </View>

                  {/* Badge "X/Y aktiv" + Chevron */}
                  <View style={styles.gruppenRechts}>
                    <View style={styles.badgeAktiv}>
                      <Text style={styles.badgeAktivText}>{gruppe.aktiv}/{gruppe.gesamt} aktiv</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.platzhalterKarte}>
              <Text style={styles.platzhalterEmoji}>👥</Text>
              <Text style={styles.platzhalterTitel}>Noch keine Gruppen</Text>
              <Text style={styles.platzhalterText}>
                Erstelle eine Gruppe und lad deine Freunde ein.
              </Text>
              <Pressable style={styles.btnPrimary} onPress={() => {}}>
                <Text style={styles.btnPrimaryText}>Gruppe erstellen</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* --- 5. Letzter Call --- */}
        <View style={styles.abschnitt}>
          <AbschnittKopf titel="Letzter Call" />

          {hatDaten ? (
            // Gefüllter Zustand: Call-Karte
            <View style={styles.callKarte}>
              <View style={[styles.avatar, { backgroundColor: letzterCallDaten.avatarFarbe.bg }]}>
                <Text style={[styles.avatarText, { color: letzterCallDaten.avatarFarbe.text }]}>
                  {letzterCallDaten.initialen}
                </Text>
              </View>
              <View style={styles.callInfo}>
                <Text style={styles.callName}>{letzterCallDaten.name}</Text>
                <Text style={styles.callMeta}>
                  {letzterCallDaten.uhrzeit} Uhr · {letzterCallDaten.dauer} · {letzterCallDaten.gruppe}
                </Text>
              </View>
              <Text style={styles.callStimmung}>{letzterCallDaten.stimmung}</Text>
            </View>
          ) : (
            <View style={styles.platzhalterKarte}>
              <Text style={styles.platzhalterText}>Noch keine Calls.</Text>
            </View>
          )}
        </View>

        {/* --- 6. Abschließende Zeile: Streak oder Motivation --- */}
        {hatDaten ? (
          <View style={styles.streakBanner}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakZahl}>{streak} Tage Streak</Text>
              <Text style={styles.streakSub}>Morgen wartet dein nächstes Match</Text>
            </View>
          </View>
        ) : (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Leg los – dein erster Call wartet.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Wiederverwendbare Abschnitts-Kopfzeile ---
function AbschnittKopf({ titel, linkText }: { titel: string; linkText?: string }) {
  return (
    <View style={styles.abschnittKopfZeile}>
      <Text style={styles.abschnittTitel}>{titel}</Text>
      {linkText && (
        <Pressable onPress={() => {}}>
          <Text style={styles.abschnittLink}>{linkText}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HINTERGRUND,
  },
  scroll: {
    padding: 20,
    paddingBottom: 52,
  },

  // --- Kopfzeile ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    marginTop: 4,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: DUNKEL,
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 14,
    color: GRAU,
    marginTop: 2,
    fontWeight: '400',
  },
  profilAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AKZENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilInitialen: {
    color: WEISS,
    fontWeight: '700',
    fontSize: 17,
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GRUEN,
    borderWidth: 2,
    borderColor: WEISS,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },

  // --- Abschnitt-Container ---
  abschnitt: {
    marginBottom: 28,
  },
  abschnittKopfZeile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  abschnittTitel: {
    fontSize: 17,
    fontWeight: '700',
    color: DUNKEL,
  },
  abschnittLink: {
    fontSize: 14,
    color: AKZENT,
    fontWeight: '500',
  },

  // --- Match-Karte ---
  matchKarte: {
    backgroundColor: WEISS,
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    ...SCHATTEN,
  },
  matchAkzentStreifen: {
    width: 4,
    backgroundColor: AKZENT,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  matchInhalt: {
    flex: 1,
    padding: 18,
    gap: 14,
  },
  matchKopf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchTextBlock: {
    flex: 1,
  },
  matchName: {
    fontSize: 17,
    fontWeight: '700',
    color: DUNKEL,
  },
  matchUnter: {
    fontSize: 13,
    color: GRAU,
    marginTop: 2,
  },

  // --- Countdown ---
  countdownBox: {
    backgroundColor: AKZENT_HELL,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 11,
    color: AKZENT,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  countdownZahl: {
    fontSize: 36,
    fontWeight: '800',
    color: AKZENT,
    letterSpacing: 3,
  },

  // --- Platzhalter-Karte (leerer Zustand) ---
  platzhalterKarte: {
    backgroundColor: WEISS,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    ...SCHATTEN,
  },
  platzhalterEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  platzhalterTitel: {
    fontSize: 16,
    fontWeight: '700',
    color: DUNKEL,
  },
  platzhalterText: {
    fontSize: 14,
    color: GRAU,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
  },

  // --- Allgemeiner Avatar ---
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGross: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatarTextGross: {
    fontSize: 18,
    fontWeight: '700',
  },
  avatarMehr: {
    backgroundColor: AKZENT,
  },
  avatarMehrText: {
    color: WEISS,
    fontSize: 13,
    fontWeight: '700',
  },

  // --- Aktiv-Bereich ---
  aktivContainer: {
    backgroundColor: WEISS,
    borderRadius: 18,
    padding: 18,
    ...SCHATTEN,
  },
  avatarReihe: {
    flexDirection: 'row',
    gap: 10,
  },

  // --- Badge Grün (Online-Zähler) ---
  badgeGruen: {
    backgroundColor: '#DCFCE7',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeGruenText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
  },

  // --- Gruppen ---
  gruppenListe: {
    gap: 10,
  },
  gruppenKarte: {
    backgroundColor: WEISS,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SCHATTEN,
  },
  gruppenEmojiContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: HINTERGRUND,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gruppenEmoji: {
    fontSize: 22,
  },
  gruppenInfo: {
    flex: 1,
  },
  gruppenName: {
    fontSize: 15,
    fontWeight: '600',
    color: DUNKEL,
  },
  gruppenFrequenz: {
    fontSize: 12,
    color: GRAU,
    marginTop: 2,
  },
  gruppenRechts: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badgeAktiv: {
    backgroundColor: '#F0FDF4',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  badgeAktivText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 18,
    color: GRAU,
    fontWeight: '300',
  },

  // --- Letzter Call ---
  callKarte: {
    backgroundColor: WEISS,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...SCHATTEN,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 15,
    fontWeight: '600',
    color: DUNKEL,
  },
  callMeta: {
    fontSize: 12,
    color: GRAU,
    marginTop: 3,
  },
  callStimmung: {
    fontSize: 26,
  },

  // --- Buttons ---
  btnPrimary: {
    backgroundColor: AKZENT,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: AKZENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPrimaryText: {
    color: WEISS,
    fontWeight: '700',
    fontSize: 16,
  },
  linkText: {
    color: AKZENT,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },

  // --- Streak-Banner ---
  streakBanner: {
    backgroundColor: WEISS,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    ...SCHATTEN,
  },
  streakEmoji: {
    fontSize: 32,
  },
  streakZahl: {
    fontSize: 16,
    fontWeight: '700',
    color: DUNKEL,
  },
  streakSub: {
    fontSize: 13,
    color: GRAU,
    marginTop: 2,
  },

  // --- Footer (leerer Zustand) ---
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: GRAU,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
