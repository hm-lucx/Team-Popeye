import { buildApp } from '../src/app.js';
import { runMaintenanceSweep } from '../src/modules/maintenance/service.js';

type SessionResponse = {
  accessToken: string;
  user: {
    id: string;
    inviteCode: string;
  };
};

type FriendRequestResponse = {
  request: {
    id: string;
  };
};

type MatchEnvelope = {
  match: {
    id: string;
    status: string;
  };
};

type MatchListResponse = {
  matches: Array<{
    id: string;
    status: string;
    counterpart: {
      id: string;
    };
  }>;
};

type CallJoinEnvelope = {
  callSession: {
    id: string;
  };
};

type StreakSummary = {
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastCompletedLocalDay: string | null;
    today: {
      localDay: string;
      status: string;
    };
  };
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildLocalDay(offsetDays: number): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return now.toISOString().slice(0, 10);
}

function buildIsoForLocalDay(localDay: string, hour: number, minute: number) {
  return `${localDay}T${hour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}:00.000Z`;
}

async function requestJson<T>(
  app: Awaited<ReturnType<typeof buildApp>>,
  input: {
    method: 'GET' | 'POST' | 'PUT';
    url: string;
    token?: string;
    payload?: Record<string, unknown>;
  },
): Promise<T> {
  const requestOptions: {
    method: 'GET' | 'POST' | 'PUT';
    url: string;
    headers?: Record<string, string>;
    payload?: Record<string, unknown>;
  } = {
    method: input.method,
    url: input.url,
  };

  if (input.payload !== undefined) {
    requestOptions.payload = input.payload;
  }

  if (input.token) {
    requestOptions.headers = {
      authorization: `Bearer ${input.token}`,
    };
  }

  const response = await app.inject(requestOptions);

  const body = response.body ? JSON.parse(response.body) : null;

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Request failed ${input.method} ${input.url}: ${response.statusCode} ${JSON.stringify(body)}`);
  }

  return body as T;
}

async function signup(app: Awaited<ReturnType<typeof buildApp>>, name: string, suffix: string) {
  return requestJson<SessionResponse>(app, {
    method: 'POST',
    url: '/auth/signup',
    payload: {
      email: `catchup-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${suffix}@example.com`,
      password: 'supersecure123',
      displayName: name,
      timezone: 'Europe/Berlin',
    },
  });
}

async function makeFriends(
  app: Awaited<ReturnType<typeof buildApp>>,
  requester: SessionResponse,
  addressee: SessionResponse,
) {
  const created = await requestJson<FriendRequestResponse>(app, {
    method: 'POST',
    url: '/social/friend-requests',
    token: requester.accessToken,
    payload: {
      inviteCode: addressee.user.inviteCode,
      message: 'Maintenance smoke test',
    },
  });

  await requestJson<FriendRequestResponse>(app, {
    method: 'POST',
    url: `/social/friend-requests/${created.request.id}/respond`,
    token: addressee.accessToken,
    payload: {
      action: 'accept',
    },
  });
}

async function createOverlapMatch(
  app: Awaited<ReturnType<typeof buildApp>>,
  userOne: SessionResponse,
  userTwo: SessionResponse,
  localDay: string,
) {
  await requestJson(app, {
    method: 'PUT',
    url: `/availability/slots/${localDay}`,
    token: userOne.accessToken,
    payload: {
      timezone: 'Europe/Berlin',
      startsAt: buildIsoForLocalDay(localDay, 18, 0),
      endsAt: buildIsoForLocalDay(localDay, 18, 30),
    },
  });

  await requestJson(app, {
    method: 'PUT',
    url: `/availability/slots/${localDay}`,
    token: userTwo.accessToken,
    payload: {
      timezone: 'Europe/Berlin',
      startsAt: buildIsoForLocalDay(localDay, 18, 5),
      endsAt: buildIsoForLocalDay(localDay, 18, 35),
    },
  });

  const result = await requestJson<MatchListResponse>(app, {
    method: 'GET',
    url: `/matches?status=pending&localDay=${localDay}`,
    token: userOne.accessToken,
  });

  const match = result.matches.find((item) => item.counterpart.id === userTwo.user.id);
  assert(match, `No pending match found for ${localDay}`);
  return match.id;
}

async function acceptMatch(
  app: Awaited<ReturnType<typeof buildApp>>,
  matchId: string,
  userOne: SessionResponse,
  userTwo: SessionResponse,
) {
  await requestJson<MatchEnvelope>(app, {
    method: 'POST',
    url: `/matches/${matchId}/respond`,
    token: userOne.accessToken,
    payload: { response: 'accept' },
  });

  const accepted = await requestJson<MatchEnvelope>(app, {
    method: 'POST',
    url: `/matches/${matchId}/respond`,
    token: userTwo.accessToken,
    payload: { response: 'accept' },
  });

  assert(accepted.match.status === 'accepted', 'Match should be accepted after both responses');
}

async function getMatch(app: Awaited<ReturnType<typeof buildApp>>, token: string, matchId: string) {
  return requestJson<MatchEnvelope>(app, {
    method: 'GET',
    url: `/matches/${matchId}`,
    token,
  });
}

async function getStreak(
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  localDay: string,
) {
  return requestJson<StreakSummary>(app, {
    method: 'GET',
    url: `/streaks/me?localDay=${localDay}`,
    token,
  });
}

const app = await buildApp();

try {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const expiredA = await signup(app, 'Expired A', suffix);
  const expiredB = await signup(app, 'Expired B', suffix);
  await makeFriends(app, expiredA, expiredB);

  const pendingDay = buildLocalDay(1);
  const expiredPendingMatchId = await createOverlapMatch(app, expiredA, expiredB, pendingDay);
  await app.db.query(
    `
      update public.matches
      set expires_at = timezone('utc', now()) - interval '1 minute'
      where id = $1
    `,
    [expiredPendingMatchId],
  );

  const pendingSweep = await runMaintenanceSweep(app);
  const expiredPendingMatch = await getMatch(app, expiredA.accessToken, expiredPendingMatchId);
  assert(expiredPendingMatch.match.status === 'expired', 'Pending match should expire during maintenance');
  assert(pendingSweep.expiredPendingCount >= 1, 'Maintenance should report at least one expired pending match');

  const missedA = await signup(app, 'Missed A', suffix);
  const missedB = await signup(app, 'Missed B', suffix);
  await makeFriends(app, missedA, missedB);

  const missedDay = buildLocalDay(2);
  const missedMatchId = await createOverlapMatch(app, missedA, missedB, missedDay);
  await acceptMatch(app, missedMatchId, missedA, missedB);
  await app.db.query(
    `
      update public.matches
      set
        overlap_starts_at = timezone('utc', now()) - interval '10 minutes',
        overlap_ends_at = timezone('utc', now()) - interval '1 minute'
      where id = $1
    `,
    [missedMatchId],
  );

  const missedSweep = await runMaintenanceSweep(app);
  const missedMatch = await getMatch(app, missedA.accessToken, missedMatchId);
  assert(missedMatch.match.status === 'missed', 'Accepted match without joined call should become missed');
  assert(missedSweep.missedCount >= 1, 'Maintenance should report at least one missed match');

  const streakA = await signup(app, 'Streak A', suffix);
  const streakB = await signup(app, 'Streak B', suffix);
  await makeFriends(app, streakA, streakB);

  const completedDayOne = buildLocalDay(3);
  const completedMatchOneId = await createOverlapMatch(app, streakA, streakB, completedDayOne);
  await acceptMatch(app, completedMatchOneId, streakA, streakB);

  const joinOneA = await requestJson<CallJoinEnvelope>(app, {
    method: 'POST',
    url: `/calls/matches/${completedMatchOneId}/join`,
    token: streakA.accessToken,
  });
  await requestJson<CallJoinEnvelope>(app, {
    method: 'POST',
    url: `/calls/matches/${completedMatchOneId}/join`,
    token: streakB.accessToken,
  });
  await requestJson(app, {
    method: 'POST',
    url: `/calls/sessions/${joinOneA.callSession.id}/events`,
    token: streakA.accessToken,
    payload: { event: 'joined' },
  });
  await requestJson(app, {
    method: 'POST',
    url: `/calls/sessions/${joinOneA.callSession.id}/events`,
    token: streakB.accessToken,
    payload: { event: 'joined' },
  });
  await app.db.query(
    `
      update public.matches
      set
        overlap_starts_at = timezone('utc', now()) - interval '10 minutes',
        overlap_ends_at = timezone('utc', now()) - interval '1 minute'
      where id = $1
    `,
    [completedMatchOneId],
  );

  const completedSweepOne = await runMaintenanceSweep(app);
  const completedMatchOne = await getMatch(app, streakA.accessToken, completedMatchOneId);
  assert(completedMatchOne.match.status === 'completed', 'Joined call should complete during maintenance');
  assert(completedSweepOne.completedCount >= 1, 'Maintenance should report at least one completed match');

  const skippedDay = buildLocalDay(4);
  await requestJson(app, {
    method: 'PUT',
    url: `/availability/status/${skippedDay}`,
    token: streakA.accessToken,
    payload: { status: 'skipped' },
  });
  await requestJson(app, {
    method: 'PUT',
    url: `/availability/status/${skippedDay}`,
    token: streakB.accessToken,
    payload: { status: 'skipped' },
  });

  const completedDayTwo = buildLocalDay(5);
  const completedMatchTwoId = await createOverlapMatch(app, streakA, streakB, completedDayTwo);
  await acceptMatch(app, completedMatchTwoId, streakA, streakB);
  const joinTwoA = await requestJson<CallJoinEnvelope>(app, {
    method: 'POST',
    url: `/calls/matches/${completedMatchTwoId}/join`,
    token: streakA.accessToken,
  });
  await requestJson<CallJoinEnvelope>(app, {
    method: 'POST',
    url: `/calls/matches/${completedMatchTwoId}/join`,
    token: streakB.accessToken,
  });
  await requestJson(app, {
    method: 'POST',
    url: `/calls/sessions/${joinTwoA.callSession.id}/events`,
    token: streakA.accessToken,
    payload: { event: 'joined' },
  });
  await requestJson(app, {
    method: 'POST',
    url: `/calls/sessions/${joinTwoA.callSession.id}/events`,
    token: streakB.accessToken,
    payload: { event: 'joined' },
  });
  await app.db.query(
    `
      update public.matches
      set
        overlap_starts_at = timezone('utc', now()) - interval '10 minutes',
        overlap_ends_at = timezone('utc', now()) - interval '1 minute'
      where id = $1
    `,
    [completedMatchTwoId],
  );

  await runMaintenanceSweep(app);

  const streakSummary = await getStreak(app, streakA.accessToken, completedDayTwo);
  assert(streakSummary.streak.currentStreak === 2, 'Skipped day between completions should preserve the streak');
  assert(streakSummary.streak.longestStreak === 2, 'Longest streak should track the new high water mark');
  assert(
    streakSummary.streak.lastCompletedLocalDay === completedDayTwo,
    'Last completed local day should track the most recent completed match',
  );
  assert(streakSummary.streak.today.status === 'completed', 'Queried local day should report completed status');

  console.log(
    JSON.stringify(
      {
        ok: true,
        expiredPendingMatchId,
        missedMatchId,
        completedMatchOneId,
        completedMatchTwoId,
        streakCurrent: streakSummary.streak.currentStreak,
        streakLongest: streakSummary.streak.longestStreak,
        streakLastCompletedLocalDay: streakSummary.streak.lastCompletedLocalDay,
      },
      null,
      2,
    ),
  );
} finally {
  await app.close();
}
