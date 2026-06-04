import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

// --- Designfarben (gleiche Palette wie alle anderen Bildschirme) ---
const HINTERGRUND = '#F2F2F7';
const DUNKEL = '#111827';
const GRAU = '#9CA3AF';

export default function VerlaufScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* --- Seitenüberschrift --- */}
        <View style={styles.header}>
          <Text style={styles.seitenTitel}>Verlauf</Text>
        </View>

        {/* --- Leerer Zustand --- */}
        <View style={styles.leerContainer}>
          <Text style={styles.leerText}>Kein Verlauf</Text>
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
    flexGrow: 1,
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

  // --- Leerer Zustand: zentriert auf der Seite ---
  leerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  leerText: {
    fontSize: 15,
    color: GRAU,
  },
});
