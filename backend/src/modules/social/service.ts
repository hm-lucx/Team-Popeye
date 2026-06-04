import type { FastifyInstance } from 'fastify';

import { withTransaction } from '../../lib/db.js';
import { AppError, isDatabaseError } from '../../lib/errors.js';
import {
  createFriendRequest,
  findFriendRequestForUser,
  findPendingFriendRequestBetweenUsers,
  findProfileByInviteCode,
  friendshipExists,
  listFriendRequestsForUser,
  listFriendsForUser,
  lockFriendRequest,
  updateFriendRequestStatus,
  type FriendRequestRecord,
  type FriendRequestStatus,
  type FriendshipRecord,
} from './repository.js';

export type FriendRequestView = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendRequestStatus;
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

export type FriendshipView = {
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

function normalizeInviteCode(inviteCode: string): string {
  return inviteCode.trim().toUpperCase();
}

function normalizeMessage(message?: string): string | null {
  const trimmed = message?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

function toFriendRequestView(record: FriendRequestRecord): FriendRequestView {
  return {
    id: record.id,
    requesterId: record.requesterId,
    addresseeId: record.addresseeId,
    status: record.status,
    inviteCodeSnapshot: record.inviteCodeSnapshot,
    message: record.message,
    respondedAt: record.respondedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    counterpart: {
      id: record.counterpartId,
      displayName: record.counterpartDisplayName,
      avatarUrl: record.counterpartAvatarUrl,
      timezone: record.counterpartTimezone,
    },
  };
}

function toFriendshipView(record: FriendshipRecord): FriendshipView {
  return {
    friendshipId: record.friendshipId,
    createdAt: record.createdAt,
    lastMatchedAt: record.lastMatchedAt,
    user: {
      id: record.userId,
      displayName: record.displayName,
      avatarUrl: record.avatarUrl,
      timezone: record.timezone,
    },
  };
}

function publishFriendRequestChanged(
  fastify: FastifyInstance,
  participants: {
    requesterId: string;
    addresseeId: string;
    requestId: string;
    status: FriendRequestStatus;
  },
) {
  const event = {
    type: 'friend_requests.changed',
    data: {
      requestId: participants.requestId,
      status: participants.status,
    },
    emittedAt: new Date().toISOString(),
  };

  fastify.publishUserEvent(participants.requesterId, event);
  fastify.publishUserEvent(participants.addresseeId, event);
}

function mapSocialError(error: unknown): never {
  if (isDatabaseError(error) && error.code === '23505') {
    throw new AppError(
      409,
      'pending_friend_request_exists',
      'There is already an open friend request between these users.',
    );
  }

  throw error;
}

export async function getFriendRequests(
  fastify: FastifyInstance,
  userId: string,
): Promise<{
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
}> {
  const requests = await listFriendRequestsForUser(fastify.db, userId);

  return {
    incoming: requests
      .filter((request) => request.addresseeId === userId)
      .map(toFriendRequestView),
    outgoing: requests
      .filter((request) => request.requesterId === userId)
      .map(toFriendRequestView),
  };
}

export async function getFriends(
  fastify: FastifyInstance,
  userId: string,
): Promise<{ friends: FriendshipView[] }> {
  const friends = await listFriendsForUser(fastify.db, userId);
  return { friends: friends.map(toFriendshipView) };
}

export async function sendFriendRequest(
  fastify: FastifyInstance,
  userId: string,
  input: {
    inviteCode: string;
    message?: string;
  },
): Promise<{ request: FriendRequestView }> {
  const inviteCode = normalizeInviteCode(input.inviteCode);
  const message = normalizeMessage(input.message);

  if (inviteCode.length < 6 || inviteCode.length > 16) {
    throw new AppError(400, 'invalid_invite_code', 'Invite code must be between 6 and 16 characters.');
  }

  if (message && message.length > 280) {
    throw new AppError(400, 'message_too_long', 'Message must be at most 280 characters long.');
  }

  const addressee = await findProfileByInviteCode(fastify.db, inviteCode);

  if (!addressee) {
    throw new AppError(404, 'invalid_invite_code', 'Invite code could not be found.');
  }

  if (addressee.id === userId) {
    throw new AppError(400, 'cannot_add_self', 'You cannot send a friend request to yourself.');
  }

  if (await friendshipExists(fastify.db, userId, addressee.id)) {
    throw new AppError(409, 'already_friends', 'You are already friends with this user.');
  }

  const existingPendingRequest = await findPendingFriendRequestBetweenUsers(
    fastify.db,
    userId,
    addressee.id,
  );

  if (existingPendingRequest) {
    throw new AppError(
      409,
      'pending_friend_request_exists',
      'There is already an open friend request between these users.',
    );
  }

  try {
    const requestId = await withTransaction(fastify.db, async (client) =>
      createFriendRequest(client, {
        requesterId: userId,
        addresseeId: addressee.id,
        inviteCodeSnapshot: inviteCode,
        message,
      }),
    );

    const record = await findFriendRequestForUser(fastify.db, userId, requestId);

    if (!record) {
      throw new Error('Failed to load created friend request.');
    }

    publishFriendRequestChanged(fastify, {
      requesterId: record.requesterId,
      addresseeId: record.addresseeId,
      requestId: record.id,
      status: record.status,
    });

    fastify.log.info(
      {
        event: 'social.friend_request.created',
        requestId: record.id,
        requesterId: record.requesterId,
        addresseeId: record.addresseeId,
      },
      'Friend request created.',
    );

    return { request: toFriendRequestView(record) };
  } catch (error) {
    mapSocialError(error);
  }
}

export async function respondToFriendRequest(
  fastify: FastifyInstance,
  userId: string,
  input: {
    requestId: string;
    action: 'accept' | 'decline';
  },
): Promise<{ request: FriendRequestView }> {
  const status: FriendRequestStatus = input.action === 'accept' ? 'accepted' : 'declined';

  const request = await withTransaction(fastify.db, async (client) => {
    const lockedRequest = await lockFriendRequest(client, input.requestId);

    if (!lockedRequest) {
      throw new AppError(404, 'friend_request_not_found', 'Friend request could not be found.');
    }

    if (lockedRequest.addresseeId !== userId) {
      throw new AppError(403, 'forbidden', 'Only the addressee can respond to this request.');
    }

    if (lockedRequest.status !== 'pending') {
      throw new AppError(409, 'friend_request_not_pending', 'This friend request is no longer pending.');
    }

    await updateFriendRequestStatus(client, input.requestId, status);

    const record = await findFriendRequestForUser(client, userId, input.requestId);

    if (!record) {
      throw new Error('Failed to load updated friend request.');
    }

    return record;
  });

  publishFriendRequestChanged(fastify, {
    requesterId: request.requesterId,
    addresseeId: request.addresseeId,
    requestId: request.id,
    status: request.status,
  });

  fastify.log.info(
    {
      event: 'social.friend_request.responded',
      requestId: request.id,
      requesterId: request.requesterId,
      addresseeId: request.addresseeId,
      status: request.status,
    },
    'Friend request response processed.',
  );

  return { request: toFriendRequestView(request) };
}

export async function cancelFriendRequest(
  fastify: FastifyInstance,
  userId: string,
  requestId: string,
): Promise<{ request: FriendRequestView }> {
  const request = await withTransaction(fastify.db, async (client) => {
    const lockedRequest = await lockFriendRequest(client, requestId);

    if (!lockedRequest) {
      throw new AppError(404, 'friend_request_not_found', 'Friend request could not be found.');
    }

    if (lockedRequest.requesterId !== userId) {
      throw new AppError(403, 'forbidden', 'Only the requester can cancel this request.');
    }

    if (lockedRequest.status !== 'pending') {
      throw new AppError(409, 'friend_request_not_pending', 'This friend request is no longer pending.');
    }

    await updateFriendRequestStatus(client, requestId, 'cancelled');

    const record = await findFriendRequestForUser(client, userId, requestId);

    if (!record) {
      throw new Error('Failed to load cancelled friend request.');
    }

    return record;
  });

  publishFriendRequestChanged(fastify, {
    requesterId: request.requesterId,
    addresseeId: request.addresseeId,
    requestId: request.id,
    status: request.status,
  });

  fastify.log.info(
    {
      event: 'social.friend_request.cancelled',
      requestId: request.id,
      requesterId: request.requesterId,
      addresseeId: request.addresseeId,
    },
    'Friend request cancelled.',
  );

  return { request: toFriendRequestView(request) };
}
