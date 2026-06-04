import { Platform } from 'react-native';

const fallbackBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://127.0.0.1:3001';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || fallbackBaseUrl
).replace(/\/$/, '');

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
};

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class CatchupApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'CatchupApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  inviteCode: string;
  avatarUrl: string | null;
};

export type SessionPayload = {
  accessToken: string;
  user: PublicUser;
};

export type FriendRequest = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
  inviteCodeSnapshot: string | null;
  message: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counterpart: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    timezone: string;
  };
};

export type Friendship = {
  friendshipId: string;
  createdAt: string;
  lastMatchedAt: string | null;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    timezone: string;
  };
};

export type AvailabilitySlot = {
  id: string;
  localDay: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyStatus = {
  id: string;
  localDay: string;
  status: 'unavailable' | 'skipped';
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Match = {
  id: string;
  localDay: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed' | 'cancelled' | 'missed';
  overlapStartsAt: string;
  overlapEndsAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counterpart: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    timezone: string;
  };
  myResponse: {
    response: 'pending' | 'accepted' | 'declined';
    respondedAt: string | null;
  };
  counterpartResponse: {
    response: 'pending' | 'accepted' | 'declined';
    respondedAt: string | null;
  };
};

export type CallParticipant = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  status: 'invited' | 'token_issued' | 'joined' | 'left' | 'missed';
  providerParticipantId: string | null;
  tokenExpiresAt: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CallSession = {
  id: string;
  matchId: string;
  provider: string;
  providerRoomId: string | null;
  roomUrl: string | null;
  status: 'scheduled' | 'active' | 'ended' | 'failed' | 'cancelled';
  roomExpiresAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  participants: CallParticipant[];
};

export type StreakSummary = {
  currentStreak: number;
  longestStreak: number;
  lastCompletedLocalDay: string | null;
  nextMilestone: number | null;
  today: {
    localDay: string;
    timezone: string;
    status:
      | 'idle'
      | 'available'
      | 'unavailable'
      | 'skipped'
      | 'pending'
      | 'accepted'
      | 'declined'
      | 'expired'
      | 'completed'
      | 'cancelled'
      | 'missed';
    hasAvailabilitySlot: boolean;
    dailyStatus: 'unavailable' | 'skipped' | null;
    matchId: string | null;
  };
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T | ErrorPayload) : null;

  if (!response.ok) {
    const errorPayload = payload as ErrorPayload | null;
    throw new CatchupApiError(
      response.status,
      errorPayload?.error?.code ?? 'request_failed',
      errorPayload?.error?.message ?? 'Die Anfrage konnte nicht verarbeitet werden.',
      errorPayload?.error?.details,
    );
  }

  return payload as T;
}

export const catchupApi = {
  signup(input: {
    email: string;
    password: string;
    displayName: string;
    timezone: string;
  }) {
    return request<SessionPayload>('/auth/signup', {
      method: 'POST',
      body: input,
    });
  },

  login(input: {
    email: string;
    password: string;
  }) {
    return request<SessionPayload>('/auth/login', {
      method: 'POST',
      body: input,
    });
  },

  refreshSession() {
    return request<SessionPayload>('/auth/refresh', {
      method: 'POST',
    });
  },

  logout() {
    return request<void>('/auth/logout', {
      method: 'POST',
    });
  },

  getMe(token: string) {
    return request<PublicUser>('/auth/me', { token });
  },

  getFriendRequests(token: string) {
    return request<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/social/friend-requests', {
      token,
    });
  },

  getFriends(token: string) {
    return request<{ friends: Friendship[] }>('/social/friends', { token });
  },

  sendFriendRequest(token: string, input: { inviteCode: string; message?: string }) {
    return request<{ request: FriendRequest }>('/social/friend-requests', {
      method: 'POST',
      token,
      body: input,
    });
  },

  respondToFriendRequest(
    token: string,
    requestId: string,
    input: { action: 'accept' | 'decline' },
  ) {
    return request<{ request: FriendRequest }>(`/social/friend-requests/${requestId}/respond`, {
      method: 'POST',
      token,
      body: input,
    });
  },

  cancelFriendRequest(token: string, requestId: string) {
    return request<{ request: FriendRequest }>(`/social/friend-requests/${requestId}/cancel`, {
      method: 'POST',
      token,
    });
  },

  getAvailability(token: string, input: { from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (input.from) {
      params.set('from', input.from);
    }
    if (input.to) {
      params.set('to', input.to);
    }

    const query = params.toString();
    return request<{ slots: AvailabilitySlot[]; dailyStatus: DailyStatus[] }>(
      `/availability/me${query ? `?${query}` : ''}`,
      { token },
    );
  },

  saveAvailabilitySlot(
    token: string,
    localDay: string,
    input: {
      timezone: string;
      startsAt: string;
      endsAt: string;
    },
  ) {
    return request<{ slot: AvailabilitySlot }>(`/availability/slots/${localDay}`, {
      method: 'PUT',
      token,
      body: input,
    });
  },

  clearAvailabilitySlot(token: string, localDay: string) {
    return request<{ cleared: boolean }>(`/availability/slots/${localDay}`, {
      method: 'DELETE',
      token,
    });
  },

  saveDailyStatus(
    token: string,
    localDay: string,
    input: {
      status: 'unavailable' | 'skipped';
      reason?: string;
    },
  ) {
    return request<{ dailyStatus: DailyStatus }>(`/availability/status/${localDay}`, {
      method: 'PUT',
      token,
      body: input,
    });
  },

  clearDailyStatus(token: string, localDay: string) {
    return request<{ cleared: boolean }>(`/availability/status/${localDay}`, {
      method: 'DELETE',
      token,
    });
  },

  getMatches(
    token: string,
    input: {
      status?: Match['status'];
      localDay?: string;
    } = {},
  ) {
    const params = new URLSearchParams();
    if (input.status) {
      params.set('status', input.status);
    }
    if (input.localDay) {
      params.set('localDay', input.localDay);
    }

    const query = params.toString();
    return request<{ matches: Match[] }>(`/matches${query ? `?${query}` : ''}`, {
      token,
    });
  },

  getMatch(token: string, matchId: string) {
    return request<{ match: Match }>(`/matches/${matchId}`, { token });
  },

  respondToMatch(
    token: string,
    matchId: string,
    input: { response: 'accept' | 'decline' },
  ) {
    return request<{ match: Match }>(`/matches/${matchId}/respond`, {
      method: 'POST',
      token,
      body: input,
    });
  },

  getCallSessionForMatch(token: string, matchId: string) {
    return request<{ callSession: CallSession | null }>(`/calls/matches/${matchId}`, {
      token,
    });
  },

  joinCallForMatch(token: string, matchId: string) {
    return request<{
      callSession: CallSession;
      join: {
        url: string;
        token: string | null;
        tokenExpiresAt: string;
      };
    }>(`/calls/matches/${matchId}/join`, {
      method: 'POST',
      token,
    });
  },

  sendCallEvent(
    token: string,
    callSessionId: string,
    input: { event: 'joined' | 'left' },
  ) {
    return request<{ callSession: CallSession }>(`/calls/sessions/${callSessionId}/events`, {
      method: 'POST',
      token,
      body: input,
    });
  },

  getStreak(token: string, localDay?: string) {
    const query = localDay ? `?localDay=${localDay}` : '';
    return request<{ streak: StreakSummary }>(`/streaks/me${query}`, { token });
  },
};
