import { useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import PressableScale from '@/components/pressable-scale';

const AKZENT = '#ff5959';
const AKZENT_HELL = '#FFF0EC';
const HINTERGRUND = '#F2F2F7';
const WEISS = '#FFFFFF';
const DUNKEL = '#111827';
const GRAU = '#6B7280';
const GRUEN = '#16A34A';
const GELB = '#D97706';

const SCHATTEN = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};

export default function GruppenScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.seitenTitel}>Gruppen</Text>
          <Text style={styles.headerText}>
            Dieser Bereich ist bewusst noch kein halbfertiger Dummy mehr, sondern ein ehrlicher
            Platzhalter mit funktionierenden Wegen zur restlichen App.
          </Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Roadmap</Text>
          <Text style={styles.heroTitle}>Gruppen sind als naechster Produktbaustein geplant.</Text>
          <Text style={styles.heroText}>
            Aktuell ist das Backend fuer 1:1 CatchUps gebaut. Sobald Gruppen modelliert sind,
            landen hier gemeinsame Verfuegbarkeiten, kleine Crews und gruppenbasierte Streaks.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Was schon laeuft</Text>
          <View style={styles.card}>
            <RoadmapRow
              color={GRUEN}
              title="Auth und Freunde"
              text="Invite-Codes, Freundschaftsanfragen und Bestaetigungen sind aktiv."
            />
            <RoadmapRow
              color={GRUEN}
              title="Verfuegbarkeit und Matching"
              text="Slots, Heute-nicht-Status und automatisches Matching funktionieren."
            />
            <RoadmapRow
              color={GELB}
              title="Calls"
              text="Lokal laeuft der Mock-Provider. Echte Video-UI kommt als naechstes."
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bis Gruppen da sind</Text>
          <View style={styles.actionStack}>
            <PressableScale style={styles.primaryButton} onPress={() => router.push('/(tabs)/friends')}>
              <Text style={styles.primaryButtonText}>Freunde aufbauen</Text>
            </PressableScale>
            <PressableScale style={styles.secondaryButton} onPress={() => router.push('/(tabs)/profil')}>
              <Text style={styles.secondaryButtonText}>Verfuegbarkeit setzen</Text>
            </PressableScale>
            <PressableScale style={styles.secondaryButton} onPress={() => router.push('/(tabs)/verlauf')}>
              <Text style={styles.secondaryButtonText}>Verlauf ansehen</Text>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RoadmapRow({
  color,
  title,
  text,
}: {
  color: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.roadmapRow}>
      <View style={[styles.roadmapDot, { backgroundColor: color }]} />
      <View style={styles.roadmapCopy}>
        <Text style={styles.roadmapTitle}>{title}</Text>
        <Text style={styles.roadmapText}>{text}</Text>
      </View>
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
    paddingBottom: 56,
    gap: 16,
  },
  header: {
    gap: 8,
    marginTop: 4,
  },
  seitenTitel: {
    fontSize: 26,
    fontWeight: '800',
    color: DUNKEL,
    letterSpacing: -0.5,
  },
  headerText: {
    color: GRAU,
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: AKZENT_HELL,
    borderRadius: 22,
    padding: 20,
    gap: 10,
  },
  heroEyebrow: {
    color: AKZENT,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    color: DUNKEL,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroText: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 21,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: DUNKEL,
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 18,
    gap: 16,
    ...SCHATTEN,
  },
  roadmapRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roadmapDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  roadmapCopy: {
    flex: 1,
    gap: 4,
  },
  roadmapTitle: {
    color: DUNKEL,
    fontSize: 16,
    fontWeight: '700',
  },
  roadmapText: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 20,
  },
  actionStack: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: AKZENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    ...SCHATTEN,
  },
  primaryButtonText: {
    color: WEISS,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: WEISS,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AKZENT,
    ...SCHATTEN,
  },
  secondaryButtonText: {
    color: AKZENT,
    fontWeight: '700',
    fontSize: 15,
  },
});
