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
  API_BASE_URL,
  catchupApi,
  CatchupApiError,
  type AvailabilitySlot,
  type DailyStatus,
  type StreakSummary,
} from '@/lib/catchup-api';
import {
  buildIsoForLocalDay,
  buildLocalDayLabel,
  formatTimeRange,
  getDeviceTimeZone,
  getTodayLocalDay,
} from '@/lib/frontend-time';
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

function statusLabel(status: StreakSummary['today']['status']) {
  switch (status) {
    case 'available':
      return 'Heute ist ein Slot gesetzt.';
    case 'unavailable':
      return 'Heute bist du fuer Calls abgemeldet.';
    case 'skipped':
      return 'Heute zaehlt neutral und unterbricht den Streak nicht.';
    case 'pending':
      return 'Ein Match wartet gerade auf Antworten.';
    case 'accepted':
      return 'Der heutige Match ist bestaetigt.';
    case 'declined':
      return 'Der heutige Match wurde abgelehnt.';
    case 'expired':
      return 'Der heutige Match ist abgelaufen.';
    case 'completed':
      return 'Dein heutiger Call wurde abgeschlossen.';
    case 'cancelled':
      return 'Der heutige Match wurde abgebrochen.';
    case 'missed':
      return 'Der heutige Match wurde verpasst.';
    default:
      return 'Noch kein Status fuer heute.';
  }
}

function dailyStatusLabel(status: DailyStatus['status']) {
  return status === 'unavailable' ? 'Heute nicht' : 'Neutral skip';
}

export default function ProfilScreen() {
  const { user, signOut, withAccessToken } = useSession();
  const { connectionState, versions } = useRealtime();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakSummary | null>(null);
  const [todaySlot, setTodaySlot] = useState<AvailabilitySlot | null>(null);
  const [todayDailyStatus, setTodayDailyStatus] = useState<DailyStatus | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [completedCallsCount, setCompletedCallsCount] = useState(0);

  const loadProfile = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const streakResult = await withAccessToken((token) => catchupApi.getStreak(token));
      const localDay = streakResult.streak.today.localDay;

      const [availabilityResult, friendsResult, matchesResult] = await Promise.all([
        withAccessToken((token) =>
          catchupApi.getAvailability(token, {
            from: localDay,
            to: localDay,
          }),
        ),
        withAccessToken((token) => catchupApi.getFriends(token)),
        withAccessToken((token) => catchupApi.getMatches(token)),
      ]);

      setStreak(streakResult.streak);
      setTodaySlot(availabilityResult.slots[0] ?? null);
      setTodayDailyStatus(availabilityResult.dailyStatus[0] ?? null);
      setFriendCount(friendsResult.friends.length);
      setCompletedCallsCount(
        matchesResult.matches.filter((match) => match.status === 'completed').length,
      );
    } catch (loadError) {
      setError(
        loadError instanceof CatchupApiError
          ? loadError.message
          : 'Profil konnte gerade nicht geladen werden.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [withAccessToken]);

  useEffect(() => {
    if (user) {
      void loadProfile();
    }
  }, [
    loadProfile,
    user,
    versions.calls,
    versions.friendRequests,
    versions.matches,
    versions.streaks,
  ]);

  async function savePresetSlot(
    actionKey: string,
    startsAt: { hour: number; minute: number },
    endsAt: { hour: number; minute: number },
  ) {
    const localDay = streak?.today.localDay ?? getTodayLocalDay();
    const timezone = streak?.today.timezone ?? getDeviceTimeZone();

    setBusyAction(actionKey);

    try {
      await withAccessToken((token) =>
        catchupApi.saveAvailabilitySlot(token, localDay, {
          timezone,
          startsAt: buildIsoForLocalDay(localDay, startsAt.hour, startsAt.minute),
          endsAt: buildIsoForLocalDay(localDay, endsAt.hour, endsAt.minute),
        }),
      );
      await loadProfile(true);
    } catch (slotError) {
      Alert.alert(
        'Zeitfenster konnte nicht gespeichert werden',
        slotError instanceof CatchupApiError
          ? slotError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function saveTodayStatus(status: DailyStatus['status']) {
    const localDay = streak?.today.localDay ?? getTodayLocalDay();

    setBusyAction(`daily:${status}`);

    try {
      await withAccessToken((token) =>
        catchupApi.saveDailyStatus(token, localDay, { status }),
      );
      await loadProfile(true);
    } catch (statusError) {
      Alert.alert(
        'Tagesstatus konnte nicht gesetzt werden',
        statusError instanceof CatchupApiError
          ? statusError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function clearToday() {
    const localDay = streak?.today.localDay ?? getTodayLocalDay();

    setBusyAction('clear');

    try {
      await withAccessToken(async (token) => {
        await catchupApi.clearAvailabilitySlot(token, localDay);
        await catchupApi.clearDailyStatus(token, localDay);
      });
      await loadProfile(true);
    } catch (clearError) {
      Alert.alert(
        'Heute konnte nicht zurueckgesetzt werden',
        clearError instanceof CatchupApiError
          ? clearError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSignOut() {
    setBusyAction('signout');

    try {
      await signOut();
    } catch {
      Alert.alert('Abmeldung fehlgeschlagen', 'Bitte versuche es gleich noch einmal.');
    } finally {
      setBusyAction(null);
    }
  }

  const localDayLabel = buildLocalDayLabel(streak?.today.localDay ?? getTodayLocalDay());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile(true)} />}
      >
        <View style={styles.header}>
          <Text style={styles.seitenTitel}>Profil</Text>
          <Text style={styles.headerText}>
            Hier steuerst du deine Verfuegbarkeit, deinen Tagesstatus und deinen Account.
          </Text>
          <Text style={styles.connectionText}>Realtime: {connectionState}</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarKreis}>
            <Text style={styles.avatarInitialen}>
              {user?.displayName.slice(0, 1).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.profilName}>{user?.displayName ?? 'Du'}</Text>
          <Text style={styles.profilUnter}>{user?.email ?? 'Noch nicht eingeloggt'}</Text>
          <View style={styles.profileMetaGrid}>
            <View style={styles.profileMetaPill}>
              <Text style={styles.profileMetaLabel}>Zeitzone</Text>
              <Text style={styles.profileMetaValue}>{user?.timezone ?? getDeviceTimeZone()}</Text>
            </View>
            <View style={styles.profileMetaPill}>
              <Text style={styles.profileMetaLabel}>Invite-Code</Text>
              <Text style={styles.profileMetaValue}>{user?.inviteCode ?? '---'}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={AKZENT} />
            <Text style={styles.helperText}>Profilstatus wird geladen...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Backend gerade nicht erreichbar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statistikKarte}>
          <StatItem label="Calls" value={completedCallsCount.toString()} />
          <View style={styles.statistikTrenner} />
          <StatItem label="Streak" value={(streak?.currentStreak ?? 0).toString()} />
          <View style={styles.statistikTrenner} />
          <StatItem label="Freunde" value={friendCount.toString()} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Heute</Text>
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <View>
                <Text style={styles.todayLabel}>Lokaler Tag</Text>
                <Text style={styles.todayDate}>{localDayLabel}</Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>🔥 {streak?.currentStreak ?? 0}</Text>
              </View>
            </View>
            <Text style={styles.todayStatusTitle}>
              {statusLabel(streak?.today.status ?? 'idle')}
            </Text>
            {todaySlot ? (
              <Text style={styles.todayHint}>
                Aktuelles Zeitfenster: {formatTimeRange(todaySlot.startsAt, todaySlot.endsAt)}
              </Text>
            ) : null}
            {todayDailyStatus ? (
              <Text style={styles.todayHint}>
                Tagesstatus: {dailyStatusLabel(todayDailyStatus.status)}
              </Text>
            ) : null}
            {!todaySlot && !todayDailyStatus ? (
              <Text style={styles.todayHint}>
                Wenn du fuer heute offen bist, setze einfach einen kurzen Slot.
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schnelle Zeitfenster</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>
              Fuer den MVP setzen wir mit einem Tap ein plausibles Fenster fuer heute.
            </Text>
            <PressableScale
              style={styles.primaryButton}
              onPress={() =>
                savePresetSlot('slot:lunch', { hour: 12, minute: 0 }, { hour: 12, minute: 15 })
              }
            >
              {busyAction === 'slot:lunch' ? (
                <ActivityIndicator color={WEISS} />
              ) : (
                <Text style={styles.primaryButtonText}>Lunch-Slot · 12:00 - 12:15</Text>
              )}
            </PressableScale>
            <PressableScale
              style={styles.primaryButton}
              onPress={() =>
                savePresetSlot('slot:afterwork', { hour: 18, minute: 0 }, { hour: 18, minute: 30 })
              }
            >
              {busyAction === 'slot:afterwork' ? (
                <ActivityIndicator color={WEISS} />
              ) : (
                <Text style={styles.primaryButtonText}>After Work · 18:00 - 18:30</Text>
              )}
            </PressableScale>
            <PressableScale
              style={styles.primaryButton}
              onPress={() =>
                savePresetSlot('slot:evening', { hour: 20, minute: 0 }, { hour: 20, minute: 30 })
              }
            >
              {busyAction === 'slot:evening' ? (
                <ActivityIndicator color={WEISS} />
              ) : (
                <Text style={styles.primaryButtonText}>Abends · 20:00 - 20:30</Text>
              )}
            </PressableScale>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tagesstatus</Text>
          <View style={styles.card}>
            <View style={styles.inlineActions}>
              <PressableScale
                style={styles.secondaryButton}
                onPress={() => saveTodayStatus('unavailable')}
              >
                {busyAction === 'daily:unavailable' ? (
                  <ActivityIndicator color={AKZENT} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Heute nicht</Text>
                )}
              </PressableScale>
              <PressableScale
                style={styles.secondaryButton}
                onPress={() => saveTodayStatus('skipped')}
              >
                {busyAction === 'daily:skipped' ? (
                  <ActivityIndicator color={AKZENT} />
                ) : (
                  <Text style={styles.secondaryButtonText}>Neutral skip</Text>
                )}
              </PressableScale>
            </View>
            <PressableScale style={styles.ghostButton} onPress={clearToday}>
              {busyAction === 'clear' ? (
                <ActivityIndicator color={DUNKEL} />
              ) : (
                <Text style={styles.ghostButtonText}>Heute zuruecksetzen</Text>
              )}
            </PressableScale>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entwicklungsstand</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: GRUEN }]} />
              <Text style={styles.infoText}>Auth, Freunde, Matching und Calls laufen lokal.</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: GELB }]} />
              <Text style={styles.infoText}>API-Basis aktuell: {API_BASE_URL}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: AKZENT }]} />
              <Text style={styles.infoText}>Gruppen und echte Video-UI kommen als naechstes.</Text>
            </View>
          </View>
        </View>

        <PressableScale style={styles.signOutButton} onPress={handleSignOut}>
          {busyAction === 'signout' ? (
            <ActivityIndicator color={AKZENT} />
          ) : (
            <Text style={styles.signOutText}>Abmelden</Text>
          )}
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statistikItem}>
      <Text style={styles.statistikZahl}>{value}</Text>
      <Text style={styles.statistikLabel}>{label}</Text>
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
  profileCard: {
    backgroundColor: WEISS,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    ...SCHATTEN,
  },
  avatarKreis: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AKZENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialen: {
    fontSize: 32,
    color: WEISS,
    fontWeight: '700',
  },
  profilName: {
    fontSize: 22,
    fontWeight: '700',
    color: DUNKEL,
  },
  profilUnter: {
    fontSize: 14,
    color: GRAU,
  },
  profileMetaGrid: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  profileMetaPill: {
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderWidth: 1,
    borderColor: GRAU_HELL,
  },
  profileMetaLabel: {
    color: GRAU,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  profileMetaValue: {
    color: DUNKEL,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
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
  statistikKarte: {
    backgroundColor: WEISS,
    borderRadius: 20,
    flexDirection: 'row',
    paddingVertical: 18,
    ...SCHATTEN,
  },
  statistikItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statistikZahl: {
    color: DUNKEL,
    fontSize: 24,
    fontWeight: '800',
  },
  statistikLabel: {
    color: GRAU,
    fontSize: 13,
    fontWeight: '600',
  },
  statistikTrenner: {
    width: 1,
    backgroundColor: GRAU_HELL,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: DUNKEL,
    fontSize: 18,
    fontWeight: '800',
  },
  todayCard: {
    backgroundColor: AKZENT_HELL,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayLabel: {
    color: AKZENT,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  todayDate: {
    color: DUNKEL,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  streakBadge: {
    borderRadius: 999,
    backgroundColor: WEISS,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streakBadgeText: {
    color: AKZENT,
    fontWeight: '800',
  },
  todayStatusTitle: {
    color: DUNKEL,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  todayHint: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    ...SCHATTEN,
  },
  cardText: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: AKZENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: WEISS,
    fontWeight: '700',
    fontSize: 15,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AKZENT,
    backgroundColor: WEISS,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: AKZENT,
    fontWeight: '700',
    fontSize: 15,
  },
  ghostButton: {
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: DUNKEL,
    fontWeight: '700',
    fontSize: 15,
  },
  infoCard: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    ...SCHATTEN,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infoText: {
    flex: 1,
    color: DUNKEL,
    fontSize: 14,
    lineHeight: 20,
  },
  signOutButton: {
    borderRadius: 16,
    backgroundColor: WEISS,
    borderWidth: 1,
    borderColor: GRAU_HELL,
    paddingVertical: 16,
    alignItems: 'center',
    ...SCHATTEN,
  },
  signOutText: {
    color: AKZENT,
    fontWeight: '800',
    fontSize: 15,
  },
});
