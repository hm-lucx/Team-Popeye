import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PressableScale from '@/components/pressable-scale';
import { CatchupApiError } from '@/lib/catchup-api';
import { getDeviceTimeZone } from '@/lib/frontend-time';
import { useSession } from '@/providers/session-provider';

const AKZENT = '#ff5959';
const AKZENT_HELL = '#FFF0EC';
const HINTERGRUND = '#F2F2F7';
const WEISS = '#FFFFFF';
const DUNKEL = '#111827';
const GRAU = '#6B7280';

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
  const { user, isBootstrapping, authBusy, signIn, signUp } = useSession();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const timezone = getDeviceTimeZone();

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={AKZENT} />
      </SafeAreaView>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  async function submit() {
    setError(null);

    try {
      if (mode === 'login') {
        await signIn({
          email: email.trim(),
          password,
        });
      } else {
        await signUp({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          timezone,
        });
      }
    } catch (submitError) {
      if (submitError instanceof CatchupApiError) {
        setError(submitError.message);
        return;
      }

      setError('Die Anmeldung konnte gerade nicht abgeschlossen werden.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.brand}>CatchUp</Text>
            <Text style={styles.title}>
              5-Minuten-Calls mit Freunden, wenn ihr beide gerade Zeit habt.
            </Text>
            <Text style={styles.subtitle}>
              Das Frontend spricht jetzt direkt mit deinem lokalen Backend.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.modeRow}>
              <PressableScale
                style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
                onPress={() => setMode('signup')}
              >
                <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>
                  Registrieren
                </Text>
              </PressableScale>
              <PressableScale
                style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[styles.modeText, mode === 'login' && styles.modeTextActive]}>
                  Einloggen
                </Text>
              </PressableScale>
            </View>

            {mode === 'signup' && (
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Anzeigename</Text>
                <TextInput
                  autoCapitalize="words"
                  placeholder="z. B. Simon"
                  placeholderTextColor={GRAU}
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
            )}

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>E-Mail</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="du@example.com"
                placeholderTextColor={GRAU}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Passwort</Text>
              <TextInput
                secureTextEntry
                placeholder="mindestens 8 Zeichen"
                placeholderTextColor={GRAU}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Zeitzone</Text>
              <Text style={styles.infoValue}>{timezone}</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PressableScale style={styles.primaryButton} onPress={submit}>
              {authBusy ? (
                <ActivityIndicator color={WEISS} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'signup' ? 'Account erstellen' : 'Weiter'}
                </Text>
              )}
            </PressableScale>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HINTERGRUND,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HINTERGRUND,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 24,
    gap: 8,
  },
  brand: {
    color: AKZENT,
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: DUNKEL,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: GRAU,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: WEISS,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#F4F4F5',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: AKZENT_HELL,
  },
  modeText: {
    color: GRAU,
    fontWeight: '700',
  },
  modeTextActive: {
    color: AKZENT,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    color: DUNKEL,
    fontWeight: '700',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: DUNKEL,
    fontSize: 15,
  },
  infoBox: {
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    padding: 14,
    gap: 4,
  },
  infoLabel: {
    color: GRAU,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    color: DUNKEL,
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: AKZENT,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryButtonText: {
    color: WEISS,
    fontWeight: '800',
    fontSize: 16,
  },
});
