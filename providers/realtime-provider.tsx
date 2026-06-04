import { createContext, startTransition, useContext, useEffect, useState, type ReactNode } from 'react';

import { CatchupApiError } from '@/lib/catchup-api';
import {
  openRealtimeStream,
  readRealtimeEvents,
  type RealtimeEventEnvelope,
} from '@/lib/realtime-stream';
import { useSession } from '@/providers/session-provider';

type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'error';

type RealtimeVersions = {
  friendRequests: number;
  matches: number;
  calls: number;
  streaks: number;
};

type RealtimeContextValue = {
  connectionState: ConnectionState;
  error: string | null;
  lastEvent: RealtimeEventEnvelope | null;
  versions: RealtimeVersions;
  reconnectNow: () => void;
};

const INITIAL_VERSIONS: RealtimeVersions = {
  friendRequests: 0,
  matches: 0,
  calls: 0,
  streaks: 0,
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function bumpVersions(current: RealtimeVersions, eventType: string): RealtimeVersions {
  switch (eventType) {
    case 'friend_requests.changed':
      return {
        ...current,
        friendRequests: current.friendRequests + 1,
      };
    case 'matches.changed':
      return {
        ...current,
        matches: current.matches + 1,
      };
    case 'calls.changed':
      return {
        ...current,
        calls: current.calls + 1,
      };
    case 'streaks.changed':
      return {
        ...current,
        streaks: current.streaks + 1,
      };
    default:
      return current;
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof CatchupApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Realtime-Verbindung konnte nicht gehalten werden.';
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user, withAccessToken } = useSession();
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<RealtimeEventEnvelope | null>(null);
  const [versions, setVersions] = useState<RealtimeVersions>(INITIAL_VERSIONS);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  useEffect(() => {
    if (!user) {
      setConnectionState('idle');
      setError(null);
      setLastEvent(null);
      setVersions(INITIAL_VERSIONS);
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = (delayMs = 1500) => {
      if (cancelled || abortController.signal.aborted) {
        return;
      }

      setConnectionState('reconnecting');
      reconnectTimer = setTimeout(() => {
        if (!cancelled && !abortController.signal.aborted) {
          void openStream();
        }
      }, delayMs);
    };

    const openStream = async () => {
      if (cancelled || abortController.signal.aborted) {
        return;
      }

      setConnectionState((current) => (current === 'idle' ? 'connecting' : 'reconnecting'));

      try {
        const response = await withAccessToken(async (accessToken) => {
          return openRealtimeStream(accessToken, abortController.signal);
        });

        if (cancelled || abortController.signal.aborted) {
          return;
        }

        setConnectionState('open');
        setError(null);

        await readRealtimeEvents(response, abortController.signal, (event) => {
          startTransition(() => {
            setLastEvent(event);
            setVersions((current) => bumpVersions(current, event.type));
          });
        });

        if (!cancelled && !abortController.signal.aborted) {
          scheduleReconnect();
        }
      } catch (streamError) {
        if (cancelled || abortController.signal.aborted) {
          return;
        }

        setConnectionState('error');
        setError(toErrorMessage(streamError));
        scheduleReconnect();
      }
    };

    setConnectionState('connecting');
    void openStream();

    return () => {
      cancelled = true;
      abortController.abort();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [reconnectNonce, user, withAccessToken]);

  const value = {
    connectionState,
    error,
    lastEvent,
    versions,
    reconnectNow: () => {
      setReconnectNonce((current) => current + 1);
    },
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  const value = useContext(RealtimeContext);

  if (!value) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }

  return value;
}
