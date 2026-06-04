import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PressableScale from '@/components/pressable-scale';
import {
  catchupApi,
  CatchupApiError,
  type FriendRequest,
  type Friendship,
} from '@/lib/catchup-api';
import { useRealtime } from '@/providers/realtime-provider';
import { useSession } from '@/providers/session-provider';

const AKZENT = '#ff5959';
const AKZENT_HELL = '#FFF0EC';
const HINTERGRUND = '#F2F2F7';
const WEISS = '#FFFFFF';
const DUNKEL = '#111827';
const GRAU = '#6B7280';
const GRAU_HELL = '#E5E7EB';
const GELB = '#D97706';

const SCHATTEN = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};

function matchesSearch(query: string, values: (string | null | undefined)[]) {
  if (!query) {
    return true;
  }

  const lowered = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(lowered));
}

export default function FreundeScreen() {
  const { user, withAccessToken } = useSession();
  const { connectionState, versions } = useRealtime();
  const [search, setSearch] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);

  const loadSocial = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const [requestResult, friendsResult] = await Promise.all([
        withAccessToken((token) => catchupApi.getFriendRequests(token)),
        withAccessToken((token) => catchupApi.getFriends(token)),
      ]);

      setIncoming(requestResult.incoming);
      setOutgoing(requestResult.outgoing);
      setFriends(friendsResult.friends);
    } catch (loadError) {
      setError(
        loadError instanceof CatchupApiError
          ? loadError.message
          : 'Freunde konnten gerade nicht geladen werden.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [withAccessToken]);

  useEffect(() => {
    if (user) {
      void loadSocial();
    }
  }, [loadSocial, user, versions.friendRequests]);

  async function handleSendRequest() {
    const normalizedInviteCode = inviteCode.trim().toUpperCase();

    if (!normalizedInviteCode) {
      Alert.alert('Invite-Code fehlt', 'Gib zuerst den Code einer Person ein.');
      return;
    }

    setBusyAction('send-request');

    try {
      const result = await withAccessToken((token) =>
        catchupApi.sendFriendRequest(token, {
          inviteCode: normalizedInviteCode,
        }),
      );

      setInviteCode('');
      await loadSocial(true);
      Alert.alert(
        'Anfrage gesendet',
        `Deine Anfrage an ${result.request.counterpart.displayName} ist raus.`,
      );
    } catch (sendError) {
      Alert.alert(
        'Anfrage konnte nicht gesendet werden',
        sendError instanceof CatchupApiError
          ? sendError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRespond(requestId: string, action: 'accept' | 'decline') {
    setBusyAction(`${action}:${requestId}`);

    try {
      await withAccessToken((token) =>
        catchupApi.respondToFriendRequest(token, requestId, { action }),
      );
      await loadSocial(true);
    } catch (respondError) {
      Alert.alert(
        'Anfrage konnte nicht aktualisiert werden',
        respondError instanceof CatchupApiError
          ? respondError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancel(requestId: string) {
    setBusyAction(`cancel:${requestId}`);

    try {
      await withAccessToken((token) => catchupApi.cancelFriendRequest(token, requestId));
      await loadSocial(true);
    } catch (cancelError) {
      Alert.alert(
        'Anfrage konnte nicht zurueckgezogen werden',
        cancelError instanceof CatchupApiError
          ? cancelError.message
          : 'Bitte versuche es gleich noch einmal.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();

  const filteredIncoming = incoming.filter((request) =>
    matchesSearch(normalizedSearch, [
      request.counterpart.displayName,
      request.counterpart.timezone,
    ]),
  );

  const filteredOutgoing = outgoing.filter((request) =>
    matchesSearch(normalizedSearch, [
      request.counterpart.displayName,
      request.counterpart.timezone,
    ]),
  );

  const filteredFriends = friends.filter((friendship) =>
    matchesSearch(normalizedSearch, [friendship.user.displayName, friendship.user.timezone]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSocial(true)} />}
      >
        <View style={styles.header}>
          <Text style={styles.seitenTitel}>Freunde</Text>
          <Text style={styles.headerText}>
            Hier laeuft dein Invite-Code-Flow, plus eingehende und bestaetigte Kontakte.
          </Text>
          <Text style={styles.connectionText}>Realtime: {connectionState}</Text>
        </View>

        <View style={styles.inviteCard}>
          <Text style={styles.sectionLabel}>Dein CatchUp-Code</Text>
          <Text style={styles.inviteCode}>{user?.inviteCode ?? '---'}</Text>
          <Text style={styles.inviteHint}>
            Dein Freund gibt diesen Code in seiner App ein. Danach kann sofort gematcht werden.
          </Text>
        </View>

        <View style={styles.suchContainer}>
          <Text style={styles.suchSymbol}>Suche</Text>
          <TextInput
            style={styles.suchInput}
            placeholder="Freunde oder Anfragen suchen..."
            placeholderTextColor={GRAU}
            returnKeyType="search"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Freund hinzufuegen</Text>
          <Text style={styles.cardText}>
            Paste hier den Invite-Code einer Person aus deiner Kontaktliste ein.
          </Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="z. B. CATCHUP42"
            placeholderTextColor={GRAU}
            style={styles.inviteInput}
            value={inviteCode}
            onChangeText={setInviteCode}
          />
          <PressableScale style={styles.primaryButton} onPress={handleSendRequest}>
            {busyAction === 'send-request' ? (
              <ActivityIndicator color={WEISS} />
            ) : (
              <Text style={styles.primaryButtonText}>Anfrage senden</Text>
            )}
          </PressableScale>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={AKZENT} />
            <Text style={styles.helperText}>Freundesliste wird geladen...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Backend gerade nicht erreichbar</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eingehende Anfragen</Text>
          {filteredIncoming.length === 0 ? (
            <EmptyState text="Noch keine offenen Anfragen fuer dich." />
          ) : (
            filteredIncoming.map((request) => (
              <View key={request.id} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View>
                    <Text style={styles.rowTitle}>{request.counterpart.displayName}</Text>
                    <Text style={styles.rowMeta}>{request.counterpart.timezone}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>pending</Text>
                  </View>
                </View>
                <View style={styles.inlineActions}>
                  <PressableScale
                    style={styles.primaryButtonInline}
                    onPress={() => handleRespond(request.id, 'accept')}
                  >
                    {busyAction === `accept:${request.id}` ? (
                      <ActivityIndicator color={WEISS} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Annehmen</Text>
                    )}
                  </PressableScale>
                  <PressableScale
                    style={styles.secondaryButtonInline}
                    onPress={() => handleRespond(request.id, 'decline')}
                  >
                    {busyAction === `decline:${request.id}` ? (
                      <ActivityIndicator color={AKZENT} />
                    ) : (
                      <Text style={styles.secondaryButtonText}>Ablehnen</Text>
                    )}
                  </PressableScale>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ausgehende Anfragen</Text>
          {filteredOutgoing.length === 0 ? (
            <EmptyState text="Du hast aktuell keine offenen Anfragen draussen." />
          ) : (
            filteredOutgoing.map((request) => (
              <View key={request.id} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View>
                    <Text style={styles.rowTitle}>{request.counterpart.displayName}</Text>
                    <Text style={styles.rowMeta}>{request.counterpart.timezone}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>wartet</Text>
                  </View>
                </View>
                <PressableScale
                  style={styles.secondaryButtonFull}
                  onPress={() => handleCancel(request.id)}
                >
                  {busyAction === `cancel:${request.id}` ? (
                    <ActivityIndicator color={AKZENT} />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Zurueckziehen</Text>
                  )}
                </PressableScale>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deine Freunde</Text>
          {filteredFriends.length === 0 ? (
            <EmptyState text="Noch keine bestaetigten Freunde. Starte mit einem Invite-Code." />
          ) : (
            filteredFriends.map((friendship) => (
              <View key={friendship.friendshipId} style={styles.friendCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {friendship.user.displayName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.friendCopy}>
                  <Text style={styles.rowTitle}>{friendship.user.displayName}</Text>
                  <Text style={styles.rowMeta}>
                    {friendship.user.timezone}
                    {friendship.lastMatchedAt ? ' · schon gematcht' : ' · noch kein Match'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>{text}</Text>
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
  inviteCard: {
    backgroundColor: AKZENT_HELL,
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  sectionLabel: {
    color: AKZENT,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  inviteCode: {
    color: DUNKEL,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  inviteHint: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 20,
  },
  suchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WEISS,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    ...SCHATTEN,
  },
  suchSymbol: {
    color: GRAU,
    fontSize: 13,
    fontWeight: '700',
  },
  suchInput: {
    flex: 1,
    fontSize: 15,
    color: DUNKEL,
    padding: 0,
  },
  card: {
    backgroundColor: WEISS,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    ...SCHATTEN,
  },
  cardTitle: {
    color: DUNKEL,
    fontSize: 18,
    fontWeight: '800',
  },
  cardText: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 20,
  },
  inviteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: DUNKEL,
    fontSize: 15,
    borderWidth: 1,
    borderColor: GRAU_HELL,
  },
  primaryButton: {
    backgroundColor: AKZENT,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonInline: {
    flex: 1,
    backgroundColor: AKZENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: WEISS,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButtonInline: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AKZENT,
    backgroundColor: WEISS,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonFull: {
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
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: DUNKEL,
    fontSize: 18,
    fontWeight: '800',
  },
  rowCard: {
    backgroundColor: WEISS,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    ...SCHATTEN,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowTitle: {
    color: DUNKEL,
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    color: GRAU,
    fontSize: 13,
    marginTop: 4,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingBadgeText: {
    color: GELB,
    fontWeight: '700',
    fontSize: 12,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  friendCard: {
    backgroundColor: WEISS,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...SCHATTEN,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AKZENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: WEISS,
    fontWeight: '800',
    fontSize: 18,
  },
  friendCopy: {
    flex: 1,
  },
  emptyCard: {
    backgroundColor: WEISS,
    borderRadius: 18,
    padding: 18,
    ...SCHATTEN,
  },
  emptyText: {
    color: GRAU,
    fontSize: 14,
    lineHeight: 20,
  },
});
