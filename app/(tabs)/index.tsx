import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import PressableScale from '@/components/pressable-scale';
import {
  catchupApi,
  CatchupApiError,
  type CallSession,
  type Match,
  type StreakSummary,
} from '@/lib/catchup-api';
import { buildLocalDayLabel, formatTimeRange } from '@/lib/frontend-time';
import { useRealtime } from '@/providers/realtime-provider';
import { useSession } from '@/providers/session-provider';

const AKZENT = '#ff5959';
const AKZENT_HELL = '#FFF0EC';
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

function statusLabel(status: Match['status'] | StreakSummary['today']['status']) {
  switch (status) {
    case 'available':
      return 'bereit fuer einen Match';
    case 'unavailable':
      return 'heute nicht verfuegbar';
    case 'skipped':
      return 'heute neutral geskippt';
    case 'pending':
      return 'wartet auf Antworten';
    case 'accepted':
      return 'bereit fuer den Call';
    case 'declined':
      return 'abgelehnt';
    case 'expired':
      return 'abgelaufen';
    case 'completed':
      return 'abgeschlossen';
    case 'cancelled':
      return 'abgebrochen';
    case 'missed':
      return 'verpasst';
    default:
      return 'noch nichts geplant';
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, withAccessToken } = useSession();
  const { connectionState, error: realtimeError, reconnectNow, versions } = useRealtime();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [incomingCount, setIncomingCount] = useState(0);
  const [outgoingCount, setOutgoingCount] = useState(0);
  const [todayMatch, setTodayMatch] = useState<Match | null>(null);
  const [callSession, setCallSession] = useState<CallSession | null>(null);

  const loadDashboard = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const streakResult = await withAccessToken((token) => catchupApi.getStreak(token));

      const [friendsResult, requestResult, matchesResult] = await Promise.all([
        withAccessToken((token) => catchupApi.getFriends(token)),
        withAccessToken((token) => catchupApi.getFriendRequests(token)),
        withAccessToken((token) =>
          catchupApi.getMatches(token, {
            localDay: streakResult.streak.today.localDay,
          }),
        ),
      ]);

      const match =
        matchesResult.matches.find((item) => item.status === 'accepted') ??
        matchesResult.matches.find((item) => item.status === 'pending') ??
        matchesResult.matches[0] ??
        null;

      setStreak(streakResult.streak);
      setFriendCount(friendsResult.friends.length);
      setIncomingCount(requestResult.incoming.filter((item) => item.status === 'pending').length);
      setOutgoingCount(requestResult.outgoing.filter((item) => item.status === 'pending').length);
      setTodayMatch(match);

      if (match && ['accepted', 'completed', 'missed'].includes(match.status)) {
        try {
          const callResult = await withAccessToken((token) => catchupApi.getCallSessionForMatch(token, match.id));
          setCallSession(callResult.callSession);
        } catch (callError) {
          if (
            callError instanceof CatchupApiError &&
            (callError.code === 'call_not_ready' || callError.code === 'call_session_not_found')
          ) {
            setCallSession(null);
          } else {
            throw callError;
          }
        }
      } else {
        setCallSession(null);
      }
    } catch (loadError) {
      if (loadError instanceof CatchupApiError) {
        setError(loadError.message);
      } else {
        setError('Dashboard konnte nicht geladen werden.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [withAccessToken]);

  useEffect(() => {
    if (user) {
      void loadDashboard();
    }
  }, [
    loadDashboard,
    user,
    versions.calls,
    versions.friendRequests,
    versions.matches,
    versions.streaks,
  ]);

  async function respondToMatch(response: 'accept' | 'decline') {
    if (!todayMatch) {
      return;
    }

    setBusyAction(response);

    try {
      await withAccessToken((token) => catchupApi.respondToMatch(token, todayMatch.id, { response }));
      await loadDashboard(true);
    } catch (respondError) {
      Alert.alert(
        'Match konnte nicht aktualisiert werden',
        respondError instanceof CatchupApiError
          ? respondError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function startCall() {
    if (!todayMatch) {
      return;
    }

    setBusyAction('join-call');

    try {
      const joined = await withAccessToken((token) => catchupApi.joinCallForMatch(token, todayMatch.id));
      await withAccessToken((token) =>
        catchupApi.sendCallEvent(token, joined.callSession.id, { event: 'joined' }),
      );
      Alert.alert(
        joined.callSession.provider === 'mock' ? 'Mock-Call gestartet' : 'Call vorbereitet',
        joined.callSession.provider === 'mock'
          ? 'Der Mock-Call laeuft jetzt im Backend. Auf dem zweiten Geraet kann die andere Person ebenfalls joinen.'
          : 'Der Call wurde vorbereitet.',
      );
      await loadDashboard(true);
    } catch (joinError) {
      Alert.alert(
        'Call konnte nicht gestartet werden',
        joinError instanceof CatchupApiError
          ? joinError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function leaveCall() {
    if (!callSession) {
      return;
    }

    setBusyAction('leave-call');

    try {
      await withAccessToken((token) =>
        catchupApi.sendCallEvent(token, callSession.id, { event: 'left' }),
      );
      await loadDashboard(true);
    } catch (leaveError) {
      Alert.alert(
        'Call konnte nicht beendet werden',
        leaveError instanceof CatchupApiError
          ? leaveError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  const myParticipant = callSession?.participants.find((participant) => participant.userId === user?.id) ?? null;
  const canLeaveCall = callSession?.status === 'active' && myParticipant?.joinedAt && !myParticipant?.leftAt;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.appName}>CatchUp</Text>
            <Text style={styles.greeting}>
              {user ? `Hi ${user.displayName.split(' ')[0]}` : 'Willkommen'}
            </Text>
            <Text style={styles.connectionText}>
              Realtime: {connectionState === 'open' ? 'live' : connectionState}
            </Text>
          </View>
          <PressableScale style={styles.profileBubble} onPress={() => router.push('/(tabs)/profil')}>
            <Text style={styles.profileBubbleText}>
              {user?.displayName.slice(0, 1).toUpperCase() ?? '?'}
            </Text>
          </PressableScale>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={AKZENT} />
            <Text style={styles.loadingText}>Dashboard wird geladen…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Backend gerade nicht erreichbar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {realtimeError && connectionState === 'error' ? (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Realtime ist gerade weg</Text>
            <Text style={styles.warningText}>{realtimeError}</Text>
            <PressableScale style={styles.warningButton} onPress={reconnectNow}>
              <Text style={styles.warningButtonText}>Neu verbinden</Text>
            </PressableScale>
          </View>
        ) : null}

        {streak ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View>
                <Text style={styles.heroLabel}>Heute</Text>
                <Text style={styles.heroDate}>{buildLocalDayLabel(streak.today.localDay)}</Text>
              </View>
              <View style={styles.streakPill}>
                <Text style={styles.streakPillText}>🔥 {streak.currentStreak}</Text>
              </View>
            </View>
            <Text style={styles.heroStatus}>{statusLabel(streak.today.status)}</Text>
            <Text style={styles.heroSubtext}>
              Längster Streak {streak.longestStreak} · nächstes Ziel{' '}
              {streak.nextMilestone ?? 'geschafft'}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dein Match heute</Text>

          {!todayMatch ? (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>Noch kein Match</Text>
              <Text style={styles.placeholderText}>
                Trag zuerst Verfügbarkeit ein oder füge mehr Freunde hinzu.
              </Text>
              <View style={styles.inlineActions}>
                <PressableScale style={styles.primaryButton} onPress={() => router.push('/(tabs)/profil')}>
                  <Text style={styles.primaryButtonText}>Verfügbarkeit setzen</Text>
                </PressableScale>
                <PressableScale style={styles.secondaryButton} onPress={() => router.push('/(tabs)/friends')}>
                  <Text style={styles.secondaryButtonText}>Freunde öffnen</Text>
                </PressableScale>
              </View>
            </View>
          ) : (
            <View style={styles.matchCard}>
              <View style={styles.matchTopRow}>
                <View>
                  <Text style={styles.matchName}>{todayMatch.counterpart.displayName}</Text>
                  <Text style={styles.matchMeta}>
                    {formatTimeRange(todayMatch.overlapStartsAt, todayMatch.overlapEndsAt)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    todayMatch.status === 'accepted'
                      ? styles.statusBadgeGreen
                      : todayMatch.status === 'pending'
                        ? styles.statusBadgeOrange
                        : styles.statusBadgeGray,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      todayMatch.status === 'accepted'
                        ? styles.statusBadgeTextGreen
                        : todayMatch.status === 'pending'
                          ? styles.statusBadgeTextOrange
                          : styles.statusBadgeTextGray,
                    ]}
                  >
                    {todayMatch.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.matchMeta}>
                Du: {todayMatch.myResponse.response} · Gegenüber: {todayMatch.counterpartResponse.response}
              </Text>

              {todayMatch.status === 'pending' ? (
                <View style={styles.inlineActions}>
                  <PressableScale
                    style={styles.primaryButton}
                    onPress={() => respondToMatch('accept')}
                  >
                    {busyAction === 'accept' ? (
                      <ActivityIndicator color={WEISS} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Annehmen</Text>
                    )}
                  </PressableScale>
                  <PressableScale
                    style={styles.secondaryButton}
                    onPress={() => respondToMatch('decline')}
                  >
                    {busyAction === 'decline' ? (
                      <ActivityIndicator color={AKZENT} />
                    ) : (
                      <Text style={styles.secondaryButtonText}>Ablehnen</Text>
                    )}
                  </PressableScale>
                </View>
              ) : null}

              {todayMatch.status === 'accepted' && !canLeaveCall ? (
                <View style={styles.inlineActions}>
                  <PressableScale style={styles.primaryButton} onPress={startCall}>
                    {busyAction === 'join-call' ? (
                      <ActivityIndicator color={WEISS} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Call starten</Text>
                    )}
                  </PressableScale>
                  <PressableScale style={styles.secondaryButton} onPress={() => router.push('/(tabs)/profil')}>
                    <Text style={styles.secondaryButtonText}>Zeit anpassen</Text>
                  </PressableScale>
                </View>
              ) : null}

              {canLeaveCall ? (
                <View style={styles.callStateCard}>
                  <Text style={styles.callStateTitle}>Mock-Call aktiv</Text>
                  <Text style={styles.callStateText}>
                    Session {callSession?.status} · Teilnehmerstatus {myParticipant?.status}
                  </Text>
                  <PressableScale style={styles.primaryButton} onPress={leaveCall}>
                    {busyAction === 'leave-call' ? (
                      <ActivityIndicator color={WEISS} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Call beenden</Text>
                    )}
                  </PressableScale>
                </View>
              ) : null}

              {['completed', 'missed', 'declined', 'expired'].includes(todayMatch.status) ? (
                <Text style={styles.matchResultText}>
                  Ergebnis: {statusLabel(todayMatch.status)}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Netzwerk heute</Text>
          <View style={styles.metricGrid}>
            <MetricCard label="Freunde" value={friendCount.toString()} />
            <MetricCard label="Eingehend" value={incomingCount.toString()} accent={GELB} />
            <MetricCard label="Ausgehend" value={outgoingCount.toString()} accent={GRUEN} />
          </View>
          <PressableScale style={styles.secondaryButtonFull} onPress={() => router.push('/(tabs)/friends')}>
            <Text style={styles.secondaryButtonText}>Freunde verwalten</Text>
          </PressableScale>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produktstand</Text>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>Gruppen kommen als Nächstes</Text>
            <Text style={styles.placeholderText}>
              Das Frontend hängt jetzt an Auth, Friends, Availability, Matches, Calls und Streaks. Gruppen sind im Backend aktuell noch nicht modelliert.
            </Text>
            <PressableScale style={styles.secondaryButtonFull} onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.secondaryButtonText}>Gruppen-Tab ansehen</Text>
            </PressableScale>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  label,
  value,
  accent = AKZENT,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricDot, { backgroundColor: accent }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    gap: 4,
  },
  appName: {
    color: AKZENT,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  connectionText: {
    color: GRAU,
    fontSize: 12,
    fontWeight: '600',
  },
  greeting: {
    color: DUNKEL,
    fontSize: 24,
    fontWeight: '800',
  },
  profileBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AKZENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBubbleText: {
    color: WEISS,
    fontWeight: '800',
    fontSize: 18,
  },
  centerCard: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    ...SCHATTEN,
  },
  loadingText: {
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
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  warningTitle: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 15,
  },
  warningText: {
    color: '#B45309',
    lineHeight: 20,
  },
  warningButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: WEISS,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningButtonText: {
    color: '#92400E',
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: WEISS,
    borderRadius: 22,
    padding: 20,
    gap: 10,
    ...SCHATTEN,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: GRAU,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroDate: {
    color: DUNKEL,
    fontWeight: '800',
    fontSize: 22,
    marginTop: 2,
  },
  streakPill: {
    backgroundColor: AKZENT_HELL,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streakPillText: {
    color: AKZENT,
    fontWeight: '800',
  },
  heroStatus: {
    color: DUNKEL,
    fontSize: 18,
    fontWeight: '700',
  },
  heroSubtext: {
    color: GRAU,
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: DUNKEL,
    fontWeight: '800',
    fontSize: 19,
  },
  placeholderCard: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    ...SCHATTEN,
  },
  placeholderTitle: {
    color: DUNKEL,
    fontWeight: '800',
    fontSize: 17,
  },
  placeholderText: {
    color: GRAU,
    lineHeight: 21,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    backgroundColor: AKZENT,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    minHeight: 50,
  },
  primaryButtonText: {
    color: WEISS,
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GRAU_HELL,
    minWidth: 140,
    minHeight: 50,
  },
  secondaryButtonFull: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GRAU_HELL,
    minHeight: 50,
  },
  secondaryButtonText: {
    color: DUNKEL,
    fontWeight: '700',
    fontSize: 15,
  },
  matchCard: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    ...SCHATTEN,
  },
  matchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  matchName: {
    color: DUNKEL,
    fontWeight: '800',
    fontSize: 18,
  },
  matchMeta: {
    color: GRAU,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeOrange: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeGray: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusBadgeTextGreen: {
    color: GRUEN,
  },
  statusBadgeTextOrange: {
    color: GELB,
  },
  statusBadgeTextGray: {
    color: GRAU,
  },
  matchResultText: {
    color: DUNKEL,
    fontWeight: '700',
  },
  callStateCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  callStateTitle: {
    color: DUNKEL,
    fontWeight: '800',
  },
  callStateText: {
    color: GRAU,
    lineHeight: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: WEISS,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    ...SCHATTEN,
  },
  metricDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metricValue: {
    color: DUNKEL,
    fontWeight: '800',
    fontSize: 24,
  },
  metricLabel: {
    color: GRAU,
    fontWeight: '600',
  },
});
