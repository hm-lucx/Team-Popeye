import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PressableScale from '@/components/pressable-scale';

// --- Designfarben (gleiche Palette wie Home-Bildschirm) ---
const AKZENT = '#ff5959';
const HINTERGRUND = '#F2F2F7';
const WEISS = '#FFFFFF';
const DUNKEL = '#111827';
const GRAU = '#9CA3AF';
const GRAU_HELL = '#E5E7EB';

const SCHATTEN = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};

export default function GruppenScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* --- Seitenüberschrift --- */}
        <View style={styles.header}>
          <Text style={styles.seitenTitel}>Gruppen</Text>
        </View>

        {/* --- Suchleiste --- */}
        <View style={styles.suchContainer}>
          {/* Such-Symbol als Text-Platzhalter */}
          <Text style={styles.suchSymbol}>🔍</Text>
          <TextInput
            style={styles.suchInput}
            placeholder="Gruppe suchen…"
            placeholderTextColor={GRAU}
            returnKeyType="search"
          />
        </View>

        {/* --- Button: Neue Gruppe erstellen --- */}
        <PressableScale style={styles.neueGruppeButton} onPress={() => {}}>
          <Text style={styles.neueGruppeText}>+ Neue Gruppe erstellen</Text>
        </PressableScale>

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
    marginBottom: 20,
    marginTop: 4,
  },
  seitenTitel: {
    fontSize: 26,
    fontWeight: '800',
    color: DUNKEL,
    letterSpacing: -0.5,
  },

  // --- Suchleiste ---
  suchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WEISS,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
    ...SCHATTEN,
  },
  suchSymbol: {
    fontSize: 16,
  },
  suchInput: {
    flex: 1,
    fontSize: 15,
    color: DUNKEL,
    padding: 0,
  },

  // --- Neue Gruppe Button ---
  neueGruppeButton: {
    backgroundColor: AKZENT,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: AKZENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  neueGruppeText: {
    color: WEISS,
    fontWeight: '700',
    fontSize: 16,
  },
});
