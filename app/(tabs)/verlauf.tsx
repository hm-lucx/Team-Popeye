import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import PressableScale from '@/components/pressable-scale';
import { catchupApi, CatchupApiError, type Match } from '@/lib/catchup-api';
import { buildLocalDayLabel, formatTimeRange } from '@/lib/frontend-time';
import { useRealtime } from '@/providers/realtime-provider';
import { useSession } from '@/providers/session-provider';

const AKZENT = '#ff5959';
const HINTERGRUND = '#F2F2F7';
const WEISS = '#FFFFFF';
const DUNKEL = '#111827';
const GRAU = '#6B7280';
const GRAU_HELL = '#E5E7EB';
const GRUEN = '#16A34A';
const GELB = '#D97706';

const SCHATTEN = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};

function statusLabel(status: Match['status']) {
  switch (status) {
    case 'accepted':
      return 'bestaetigt';
    case 'pending':
      return 'pending';
    case 'completed':
      return 'abgeschlossen';
    case 'declined':
      return 'abgelehnt';
    case 'expired':
      return 'abgelaufen';
    case 'cancelled':
      return 'abgebrochen';
    case 'missed':
      return 'verpasst';
    default:
      return status;
  }
}

function badgeStyle(status: Match['status']) {
  if (status === 'completed' || status === 'accepted') {
    return {
      backgroundColor: '#DCFCE7',
      color: GRUEN,
    };
  }

  if (status === 'pending') {
    return {
      backgroundColor: '#FEF3C7',
      color: GELB,
    };
  }

  return {
    backgroundColor: '#F3F4F6',
    color: GRAU,
  };
}

export default function VerlaufScreen() {
  const { withAccessToken } = useSession();
  const { connectionState, versions } = useRealtime();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);

  const loadMatches = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await withAccessToken((token) => catchupApi.getMatches(token));
      const sorted = [...result.matches].sort((left, right) => {
        if (left.localDay === right.localDay) {
          return right.createdAt.localeCompare(left.createdAt);
        }

        return right.localDay.localeCompare(left.localDay);
      });

      setMatches(sorted);
    } catch (loadError) {
      setError(
        loadError instanceof CatchupApiError
          ? loadError.message
          : 'Verlauf konnte gerade nicht geladen werden.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [withAccessToken]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches, versions.calls, versions.matches]);

  const completedCount = matches.filter((match) => match.status === 'completed').length;
  const pendingCount = matches.filter((match) => match.status === 'pending').length;
  const missedCount = matches.filter((match) => match.status === 'missed').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMatches(true)} />}
      >
        <View style={styles.header}>
          <Text style={styles.seitenTitel}>Verlauf</Text>
          <Text style={styles.headerText}>
            Hier siehst du vergangene Matches, offene Antworten und verpasste Slots.
          </Text>
          <Text style={styles.connectionText}>Realtime: {connectionState}</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryPill label="Calls" value={completedCount.toString()} accent={GRUEN} />
          <SummaryPill label="Offen" value={pendingCount.toString()} accent={GELB} />
          <SummaryPill label="Missed" value={missedCount.toString()} accent={AKZENT} />
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={AKZENT} />
            <Text style={styles.helperText}>Verlauf wird geladen...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Backend gerade nicht erreichbar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && matches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Noch kein Verlauf</Text>
            <Text style={styles.emptyText}>
              Sobald ihr euch befreundet und erste Slots gesetzt habt, tauchen hier die Matches auf.
            </Text>
          </View>
        ) : null}

        {matches.map((match) => {
          const badge = badgeStyle(match.status);

          return (
            <View key={match.id} style={styles.matchCard}>
              <View style={styles.rowHeader}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{match.counterpart.displayName}</Text>
                  <Text style={styles.rowMeta}>
                    {buildLocalDayLabel(match.localDay)} ·{' '}
                    {formatTimeRange(match.overlapStartsAt, match.overlapEndsAt)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>
                    {statusLabel(match.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.responseRow}>
                <Text style={styles.responseText}>Du: {match.myResponse.response}</Text>
                <Text style={styles.responseDivider}>·</Text>
                <Text style={styles.responseText}>
                  Gegenueber: {match.counterpartResponse.response}
                </Text>
              </View>

              <Text style={styles.hintText}>
                {match.status === 'completed'
                  ? 'Dieser Call wurde sauber abgeschlossen.'
                  : match.status === 'accepted'
                    ? 'Dieser Match ist bereit fuer den Call.'
                    : match.status === 'pending'
                      ? 'Hier wartet mindestens eine Person noch auf Antwort.'
                      : match.status === 'missed'
                        ? 'Dieser Match wurde zeitlich verpasst.'
                        : 'Dieser Match ist nicht in einen erfolgreichen Call uebergegangen.'}
              </Text>
            </View>
          );
        })}

        <PressableScale style={styles.refreshButton} onPress={() => loadMatches(true)}>
          <Text style={styles.refreshButtonText}>Verlauf aktualisieren</Text>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View style={styles.summaryPill}>
      <View style={[styles.summaryDot, { backgroundColor: accent }]} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
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
  connectionText: {
    color: GRAU,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: WEISS,
    borderRadius: 18,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
    ...SCHATTEN,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryValue: {
    color: DUNKEL,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    color: GRAU,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  centerCard: {
    backgroundColor: WEISS,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    ...SCHATTEN,
  },
  helperText: {
    color: GRAU,
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  errorTitle: {
    color: '#991B1B',
    fontWeight: '800',
    fontSize: 15,
  },
  errorText: {
    color: '#B91C1C',
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 20,
    gap: 8,
    ...SCHATTEN,
  },
  emptyTitle: {
    color: DUNKEL,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 20,
  },
  matchCard: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    ...SCHATTEN,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: DUNKEL,
    fontSize: 17,
    fontWeight: '800',
  },
  rowMeta: {
    color: GRAU,
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responseText: {
    color: DUNKEL,
    fontSize: 14,
    fontWeight: '600',
  },
  responseDivider: {
    color: GRAU,
  },
  hintText: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 20,
  },
  refreshButton: {
    borderRadius: 14,
    backgroundColor: WEISS,
    borderWidth: 1,
    borderColor: GRAU_HELL,
    paddingVertical: 16,
    alignItems: 'center',
    ...SCHATTEN,
  },
  refreshButtonText: {
    color: AKZENT,
    fontWeight: '800',
    fontSize: 15,
  },
});
