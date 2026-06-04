import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import PressableScale from '@/components/pressable-scale';

// --- Designfarben (gleiche Palette wie alle anderen Bildschirme) ---
const AKZENT = '#ff5959';
const HINTERGRUND = '#F2F2F7';
const WEISS = '#FFFFFF';
const DUNKEL = '#111827';
const GRAU = '#9CA3AF';
const GRAU_HELL = '#E5E7EB';
const TRENNLINIE = '#F3F4F6';

const SCHATTEN = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};

// --- Wochentage für den Verfügbarkeits-Picker ---
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// --- Einstellungs-Zeilen ---
const EINSTELLUNGEN = [
  { label: 'Benachrichtigungen', hinweis: 'An' },
  { label: 'Privatsphäre', hinweis: '' },
  { label: 'Sicherheit', hinweis: '' },
  { label: 'Hilfe & Support', hinweis: '' },
];

export default function ProfilScreen() {
  // Speichert, welche Wochentage ausgewählt sind (als Set von Indizes)
  const [ausgewaehlt, setAusgewaehlt] = useState<Set<number>>(new Set());

  // Wechselt einen Tag zwischen ausgewählt und nicht ausgewählt
  function tagUmschalten(index: number) {
    setAusgewaehlt((vorher) => {
      const neu = new Set(vorher);
      if (neu.has(index)) {
        neu.delete(index);
      } else {
        neu.add(index);
      }
      return neu;
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* --- 1. Überschrift --- */}
        <View style={styles.header}>
          <Text style={styles.seitenTitel}>Profil</Text>
        </View>

        {/* --- 2. Profil-Kopf: Avatar, Name, Unterzeile --- */}
        <View style={styles.profilKopf}>
          {/* Runder Avatar-Platzhalter mit "+" – antippbar mit Druck-Effekt */}
          <PressableScale style={styles.avatarWrapper} onPress={() => {}}>
            <View style={styles.avatarKreis}>
              <Text style={styles.avatarInitialen}>P</Text>
            </View>
            {/* Kleines Plus-Symbol unten rechts – antippbar (Platzhalter) */}
            <Pressable style={styles.avatarPlus} onPress={() => {}}>
              <Text style={styles.avatarPlusText}>+</Text>
            </Pressable>
          </PressableScale>

          <Text style={styles.profilName}>Du</Text>
          <Text style={styles.profilUnter}>Profil vervollständigen</Text>
        </View>

        {/* --- 3. Statistik-Reihe --- */}
        <View style={styles.statistikKarte}>
          <View style={styles.statistikItem}>
            <Text style={styles.statistikZahl}>0</Text>
            <Text style={styles.statistikLabel}>Calls</Text>
          </View>

          {/* Trennlinie zwischen den Werten */}
          <View style={styles.statistikTrenner} />

          <View style={styles.statistikItem}>
            <Text style={styles.statistikZahl}>0</Text>
            <Text style={styles.statistikLabel}>Streak</Text>
          </View>

          <View style={styles.statistikTrenner} />

          <View style={styles.statistikItem}>
            <Text style={styles.statistikZahl}>0</Text>
            <Text style={styles.statistikLabel}>Gruppen</Text>
          </View>
        </View>

        {/* --- 4. Verfügbarkeit: Wochentags-Picker --- */}
        <View style={styles.abschnitt}>
          <Text style={styles.abschnittTitel}>Verfügbarkeit</Text>
          <View style={styles.wochentagsReihe}>
            {WOCHENTAGE.map((tag, index) => {
              const istAusgewaehlt = ausgewaehlt.has(index);
              return (
                <Pressable
                  key={tag}
                  style={[
                    styles.wochentagsFeld,
                    istAusgewaehlt && styles.wochentagsAusgewaehlt,
                  ]}
                  onPress={() => tagUmschalten(index)}
                >
                  <Text
                    style={[
                      styles.wochentagsText,
                      istAusgewaehlt && styles.wochentagsTextAusgewaehlt,
                    ]}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* --- 5. Zeitfenster --- */}
        <View style={styles.abschnitt}>
          <Text style={styles.abschnittTitel}>Zeitfenster</Text>
          <Pressable style={styles.zeitfensterButton} onPress={() => {}}>
            <Text style={styles.zeitfensterText}>Zeitfenster wählen</Text>
          </Pressable>
        </View>

        {/* --- 6. Einstellungen --- */}
        <View style={styles.abschnitt}>
          <Text style={styles.abschnittTitel}>Einstellungen</Text>
          <View style={styles.einstellungenKarte}>
            {EINSTELLUNGEN.map((eintrag, index) => (
              <View key={eintrag.label}>
                <Pressable
                  style={styles.einstellungsZeile}
                  onPress={() => {}}
                >
                  <Text style={styles.einstellungsLabel}>{eintrag.label}</Text>
                  <View style={styles.einstellungsRechts}>
                    {/* Optionaler Hinweis-Text (z. B. "An") */}
                    {eintrag.hinweis !== '' && (
                      <Text style={styles.einstellungsHinweis}>{eintrag.hinweis}</Text>
                    )}
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>

                {/* Trennlinie zwischen den Zeilen, nicht nach der letzten */}
                {index < EINSTELLUNGEN.length - 1 && (
                  <View style={styles.zeilenTrenner} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* --- 7. Abmelden-Button (optisch abgesetzt) --- */}
        <View style={styles.abmeldenBereich}>
          <Pressable style={styles.abmeldenButton} onPress={() => {}}>
            <Text style={styles.abmeldenText}>Abmelden</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
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

  // --- Überschrift ---
  header: {
    marginBottom: 24,
    marginTop: 4,
  },
  seitenTitel: {
    fontSize: 26,
    fontWeight: '800',
    color: DUNKEL,
    letterSpacing: -0.5,
  },

  // --- Profil-Kopf ---
  profilKopf: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarKreis: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AKZENT,   // identische Farbe wie der kleine Avatar auf Home
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialen: {
    fontSize: 32,
    color: WEISS,              // weißer Buchstabe auf rotem Hintergrund, wie auf Home
    fontWeight: '700',
  },
  avatarPlus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WEISS,    // weißer Kreis kontrastiert klar gegen den roten Avatar
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: HINTERGRUND,  // dezenter Rand, der den Kreis vom Avatar trennt
  },
  avatarPlusText: {
    color: AKZENT,             // rotes "+" auf weißem Hintergrund – gut sichtbar
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  profilName: {
    fontSize: 20,
    fontWeight: '700',
    color: DUNKEL,
  },
  profilUnter: {
    fontSize: 13,
    color: GRAU,
    marginTop: 4,
  },

  // --- Statistik-Reihe ---
  statistikKarte: {
    backgroundColor: WEISS,
    borderRadius: 18,
    flexDirection: 'row',
    paddingVertical: 18,
    marginBottom: 28,
    ...SCHATTEN,
  },
  statistikItem: {
    flex: 1,
    alignItems: 'center',
  },
  statistikZahl: {
    fontSize: 22,
    fontWeight: '800',
    color: DUNKEL,
  },
  statistikLabel: {
    fontSize: 12,
    color: GRAU,
    marginTop: 3,
  },
  statistikTrenner: {
    width: 1,
    backgroundColor: GRAU_HELL,
    marginVertical: 4,
  },

  // --- Abschnitt-Container ---
  abschnitt: {
    marginBottom: 28,
  },
  abschnittTitel: {
    fontSize: 17,
    fontWeight: '700',
    color: DUNKEL,
    marginBottom: 12,
  },

  // --- Wochentags-Picker ---
  wochentagsReihe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  wochentagsFeld: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: WEISS,
    alignItems: 'center',
    ...SCHATTEN,
  },
  wochentagsAusgewaehlt: {
    backgroundColor: DUNKEL,
  },
  wochentagsText: {
    fontSize: 12,
    fontWeight: '600',
    color: GRAU,
  },
  wochentagsTextAusgewaehlt: {
    color: WEISS,
  },

  // --- Zeitfenster-Button ---
  zeitfensterButton: {
    backgroundColor: WEISS,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: AKZENT,
    ...SCHATTEN,
  },
  zeitfensterText: {
    color: AKZENT,
    fontWeight: '600',
    fontSize: 15,
  },

  // --- Einstellungen-Karte ---
  einstellungenKarte: {
    backgroundColor: WEISS,
    borderRadius: 18,
    overflow: 'hidden',
    ...SCHATTEN,
  },
  einstellungsZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 18,
  },
  einstellungsLabel: {
    fontSize: 15,
    color: DUNKEL,
    fontWeight: '400',
  },
  einstellungsRechts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  einstellungsHinweis: {
    fontSize: 14,
    color: GRAU,
  },
  chevron: {
    fontSize: 20,
    color: GRAU,
    fontWeight: '300',
  },
  zeilenTrenner: {
    height: 1,
    backgroundColor: TRENNLINIE,
    marginLeft: 18,
  },

  // --- Abmelden ---
  abmeldenBereich: {
    marginTop: 8,
  },
  abmeldenButton: {
    backgroundColor: WEISS,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    ...SCHATTEN,
  },
  abmeldenText: {
    color: AKZENT,
    fontWeight: '600',
    fontSize: 15,
  },
});
