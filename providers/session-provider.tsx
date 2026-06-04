import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import {
  catchupApi,
  CatchupApiError,
  type PublicUser,
  type SessionPayload,
} from '@/lib/catchup-api';

type SessionContextValue = {
  accessToken: string | null;
  user: PublicUser | null;
  isBootstrapping: boolean;
  authBusy: boolean;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    displayName: string;
    timezone: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  withAccessToken: <T>(run: (accessToken: string) => Promise<T>) => Promise<T>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function applySession(
  setAccessToken: (value: string | null) => void,
  setUser: (value: PublicUser | null) => void,
  payload: SessionPayload | null,
) {
  setAccessToken(payload?.accessToken ?? null);
  setUser(payload?.user ?? null);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);

  async function refreshSessionSilently() {
    try {
      const payload = await catchupApi.refreshSession();
      applySession(setAccessToken, setUser, payload);
      return payload;
    } catch {
      applySession(setAccessToken, setUser, null);
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await refreshSessionSilently();
      if (!cancelled) {
        setIsBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(input: { email: string; password: string }) {
    setAuthBusy(true);

    try {
      const payload = await catchupApi.login(input);
      applySession(setAccessToken, setUser, payload);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signUp(input: {
    email: string;
    password: string;
    displayName: string;
    timezone: string;
  }) {
    setAuthBusy(true);

    try {
      const payload = await catchupApi.signup(input);
      applySession(setAccessToken, setUser, payload);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setAuthBusy(true);

    try {
      await catchupApi.logout();
    } finally {
      applySession(setAccessToken, setUser, null);
      setAuthBusy(false);
    }
  }

  async function withAccessToken<T>(run: (token: string) => Promise<T>): Promise<T> {
    if (!accessToken) {
      throw new CatchupApiError(401, 'unauthorized', 'Bitte melde dich zuerst an.');
    }

    try {
      return await run(accessToken);
    } catch (error) {
      if (error instanceof CatchupApiError && error.status === 401) {
        const refreshed = await refreshSessionSilently();

        if (refreshed?.accessToken) {
          return run(refreshed.accessToken);
        }
      }

      throw error;
    }
  }

  return (
    <SessionContext.Provider
      value={{
        accessToken,
        user,
        isBootstrapping,
        authBusy,
        signIn,
        signUp,
        signOut,
        withAccessToken,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return value;
}
