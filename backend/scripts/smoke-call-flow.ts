type SessionResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    timezone: string;
    inviteCode: string;
  };
};

type FriendRequestResponse = {
  request: {
    id: string;
    status: string;
  };
};

type FriendRequestIndex = {
  incoming: Array<{
    id: string;
    requesterId: string;
    status: string;
  }>;
  outgoing: Array<{
    id: string;
    addresseeId: string;
    status: string;
  }>;
};

type MatchEnvelope = {
  match: {
    id: string;
    status: string;
    localDay: string;
    counterpart: {
      id: string;
      displayName: string;
    };
    myResponse: {
      response: string;
    };
    counterpartResponse: {
      response: string;
    };
  } | null;
};

type MatchListResponse = {
  matches: Array<NonNullable<MatchEnvelope['match']>>;
};

type CallSessionEnvelope = {
  callSession: {
    id: string;
    status: string;
    roomUrl: string | null;
    startedAt: string | null;
    endedAt: string | null;
    metadata: Record<string, unknown>;
    participants: Array<{
      userId: string;
      status: string;
      joinedAt: string | null;
      leftAt: string | null;
    }>;
  } | null;
};

type CallJoinEnvelope = {
  callSession: NonNullable<CallSessionEnvelope['callSession']>;
  join: {
    url: string;
    token: string | null;
    tokenExpiresAt: string;
  };
};

const baseUrl = process.env.APP_BASE_URL ?? 'http://127.0.0.1:3001';
const timezone = 'Europe/Berlin';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildLocalDay() {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 1);
  return now.toISOString().slice(0, 10);
}

function buildIsoForLocalDay(localDay: string, hour: number, minute: number) {
  return `${localDay}T${hour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}:00.000Z`;
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined) {
    headers.set('content-type', 'application/json');
  }

  if (init.token) {
    headers.set('authorization', `Bearer ${init.token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `Request failed ${init.method ?? 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`,
    );
  }

  return body as T;
}

async function signupUser(name: string, suffix: string) {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const email = `catchup-${normalizedName}-${suffix}@example.com`;
  return requestJson<SessionResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'supersecure123',
      displayName: name,
      timezone,
    }),
  });
}

async function findPendingMatch(token: string, localDay: string, counterpartId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await requestJson<MatchListResponse>(
      `/matches?status=pending&localDay=${localDay}`,
      { token },
    );
    const match = result.matches.find((item) => item.counterpart.id === counterpartId);

    if (match) {
      return match;
    }

    await wait(150);
  }

  throw new Error('No pending match was created for the overlapping slots');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const localDay = buildLocalDay();

  const alice = await signupUser('Alice Smoke', suffix);
  const bob = await signupUser('Bob Smoke', suffix);

  const friendRequest = await requestJson<FriendRequestResponse>('/social/friend-requests', {
    method: 'POST',
    token: alice.accessToken,
    body: JSON.stringify({
      inviteCode: bob.user.inviteCode,
      message: 'Smoke test request',
    }),
  });

  const bobRequests = await requestJson<FriendRequestIndex>('/social/friend-requests', {
    token: bob.accessToken,
  });
  const incomingRequest = bobRequests.incoming.find((item) => item.id === friendRequest.request.id);
  assert(incomingRequest, 'Bob did not receive the incoming friend request');

  await requestJson<FriendRequestResponse>(
    `/social/friend-requests/${friendRequest.request.id}/respond`,
    {
      method: 'POST',
      token: bob.accessToken,
      body: JSON.stringify({ action: 'accept' }),
    },
  );

  await requestJson(`/availability/slots/${localDay}`, {
    method: 'PUT',
    token: alice.accessToken,
    body: JSON.stringify({
      timezone,
      startsAt: buildIsoForLocalDay(localDay, 18, 0),
      endsAt: buildIsoForLocalDay(localDay, 18, 30),
    }),
  });
  await requestJson(`/availability/slots/${localDay}`, {
    method: 'PUT',
    token: bob.accessToken,
    body: JSON.stringify({
      timezone,
      startsAt: buildIsoForLocalDay(localDay, 18, 5),
      endsAt: buildIsoForLocalDay(localDay, 18, 35),
    }),
  });

  const pendingMatch = await findPendingMatch(alice.accessToken, localDay, bob.user.id);

  const firstAccept = await requestJson<MatchEnvelope>(`/matches/${pendingMatch.id}/respond`, {
    method: 'POST',
    token: alice.accessToken,
    body: JSON.stringify({ response: 'accept' }),
  });
  assert(firstAccept.match?.status === 'pending', 'First accept should keep the match pending');

  const secondAccept = await requestJson<MatchEnvelope>(`/matches/${pendingMatch.id}/respond`, {
    method: 'POST',
    token: bob.accessToken,
    body: JSON.stringify({ response: 'accept' }),
  });
  assert(secondAccept.match?.status === 'accepted', 'Second accept should mark the match accepted');

  const beforeJoin = await requestJson<CallSessionEnvelope>(`/calls/matches/${pendingMatch.id}`, {
    token: alice.accessToken,
  });
  assert(beforeJoin.callSession === null, 'Accepted match without join should not have a call session yet');

  const aliceJoin = await requestJson<CallJoinEnvelope>(`/calls/matches/${pendingMatch.id}/join`, {
    method: 'POST',
    token: alice.accessToken,
  });
  const bobJoin = await requestJson<CallJoinEnvelope>(`/calls/matches/${pendingMatch.id}/join`, {
    method: 'POST',
    token: bob.accessToken,
  });

  assert(aliceJoin.callSession.id === bobJoin.callSession.id, 'Both users must join the same call session');
  assert(Boolean(aliceJoin.callSession.metadata.mock), 'Mock provider metadata should be preserved');

  await requestJson<CallSessionEnvelope>(`/calls/sessions/${aliceJoin.callSession.id}/events`, {
    method: 'POST',
    token: alice.accessToken,
    body: JSON.stringify({ event: 'joined' }),
  });
  await requestJson<CallSessionEnvelope>(`/calls/sessions/${aliceJoin.callSession.id}/events`, {
    method: 'POST',
    token: bob.accessToken,
    body: JSON.stringify({ event: 'joined' }),
  });
  await requestJson<CallSessionEnvelope>(`/calls/sessions/${aliceJoin.callSession.id}/events`, {
    method: 'POST',
    token: alice.accessToken,
    body: JSON.stringify({ event: 'left' }),
  });
  await requestJson<CallSessionEnvelope>(`/calls/sessions/${aliceJoin.callSession.id}/events`, {
    method: 'POST',
    token: bob.accessToken,
    body: JSON.stringify({ event: 'left' }),
  });

  const endedSession = await requestJson<CallSessionEnvelope>(`/calls/matches/${pendingMatch.id}`, {
    token: alice.accessToken,
  });
  assert(endedSession.callSession, 'Completed match should keep the ended call session readable');
  assert(endedSession.callSession.status === 'ended', 'Call session should end after both participants leave');
  assert(endedSession.callSession.startedAt, 'Call session should have startedAt once participants join');
  assert(endedSession.callSession.endedAt, 'Call session should have endedAt once participants leave');
  assert(Boolean(endedSession.callSession.metadata.mock), 'Ended session metadata should still include mock provider details');
  assert(
    endedSession.callSession.participants.every((participant) => participant.status === 'left'),
    'All participants should be marked left at the end of the call',
  );

  const completedMatch = await requestJson<MatchEnvelope>(`/matches/${pendingMatch.id}`, {
    token: alice.accessToken,
  });
  assert(completedMatch.match?.status === 'completed', 'Match should be completed after the call ends');

  console.log(
    JSON.stringify(
      {
        ok: true,
        localDay,
        matchId: pendingMatch.id,
        callSessionId: endedSession.callSession.id,
        roomUrl: endedSession.callSession.roomUrl,
        startedAt: endedSession.callSession.startedAt,
        endedAt: endedSession.callSession.endedAt,
        metadata: endedSession.callSession.metadata,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
