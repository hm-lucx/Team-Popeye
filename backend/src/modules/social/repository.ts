import type { Queryable } from '../../lib/db.js';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export type SocialProfileRecord = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  inviteCode?: string;
};

export type FriendRequestRecord = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendRequestStatus;
  inviteCodeSnapshot: string | null;
  message: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counterpartId: string;
  counterpartDisplayName: string;
  counterpartAvatarUrl: string | null;
  counterpartTimezone: string;
};

export type FriendRequestStateRecord = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendRequestStatus;
};

export type FriendshipRecord = {
  friendshipId: string;
  createdAt: string;
  lastMatchedAt: string | null;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
};

export async function findProfileByInviteCode(
  db: Queryable,
  inviteCode: string,
): Promise<SocialProfileRecord | null> {
  const result = await db.query<SocialProfileRecord>(
    `
      select
        p.id,
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.timezone,
        p.invite_code as "inviteCode"
      from public.profiles p
      where p.invite_code = $1
      limit 1
    `,
    [inviteCode],
  );

  return result.rows[0] ?? null;
}

export async function friendshipExists(
  db: Queryable,
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  const result = await db.query(
    `
      select 1
      from public.friendships f
      where (
        f.user_one_id = $1
        and f.user_two_id = $2
      ) or (
        f.user_one_id = $2
        and f.user_two_id = $1
      )
      limit 1
    `,
    [userId, otherUserId],
  );

  return Boolean(result.rowCount && result.rowCount > 0);
}

export async function findPendingFriendRequestBetweenUsers(
  db: Queryable,
  userId: string,
  otherUserId: string,
): Promise<FriendRequestStateRecord | null> {
  const result = await db.query<FriendRequestStateRecord>(
    `
      select
        fr.id,
        fr.requester_id as "requesterId",
        fr.addressee_id as "addresseeId",
        fr.status
      from public.friend_requests fr
      where fr.status = 'pending'
        and (
          (fr.requester_id = $1 and fr.addressee_id = $2)
          or
          (fr.requester_id = $2 and fr.addressee_id = $1)
        )
      limit 1
    `,
    [userId, otherUserId],
  );

  return result.rows[0] ?? null;
}

export async function createFriendRequest(
  db: Queryable,
  input: {
    requesterId: string;
    addresseeId: string;
    inviteCodeSnapshot: string;
    message: string | null;
  },
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `
      insert into public.friend_requests (
        requester_id,
        addressee_id,
        invite_code_snapshot,
        message
      )
      values ($1, $2, $3, $4)
      returning id
    `,
    [
      input.requesterId,
      input.addresseeId,
      input.inviteCodeSnapshot,
      input.message,
    ],
  );

  const id = result.rows[0]?.id;

  if (!id) {
    throw new Error('Failed to create friend request.');
  }

  return id;
}

export async function listFriendRequestsForUser(
  db: Queryable,
  userId: string,
): Promise<FriendRequestRecord[]> {
  const result = await db.query<FriendRequestRecord>(
    `
      select
        fr.id,
        fr.requester_id as "requesterId",
        fr.addressee_id as "addresseeId",
        fr.status,
        fr.invite_code_snapshot as "inviteCodeSnapshot",
        fr.message,
        fr.responded_at as "respondedAt",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        p.id as "counterpartId",
        p.display_name as "counterpartDisplayName",
        p.avatar_url as "counterpartAvatarUrl",
        p.timezone as "counterpartTimezone"
      from public.friend_requests fr
      join public.profiles p
        on p.id = case
          when fr.requester_id = $1 then fr.addressee_id
          else fr.requester_id
        end
      where fr.requester_id = $1
         or fr.addressee_id = $1
      order by fr.created_at desc
    `,
    [userId],
  );

  return result.rows;
}

export async function findFriendRequestForUser(
  db: Queryable,
  userId: string,
  requestId: string,
): Promise<FriendRequestRecord | null> {
  const result = await db.query<FriendRequestRecord>(
    `
      select
        fr.id,
        fr.requester_id as "requesterId",
        fr.addressee_id as "addresseeId",
        fr.status,
        fr.invite_code_snapshot as "inviteCodeSnapshot",
        fr.message,
        fr.responded_at as "respondedAt",
        fr.created_at as "createdAt",
        fr.updated_at as "updatedAt",
        p.id as "counterpartId",
        p.display_name as "counterpartDisplayName",
        p.avatar_url as "counterpartAvatarUrl",
        p.timezone as "counterpartTimezone"
      from public.friend_requests fr
      join public.profiles p
        on p.id = case
          when fr.requester_id = $1 then fr.addressee_id
          else fr.requester_id
        end
      where fr.id = $2
        and (fr.requester_id = $1 or fr.addressee_id = $1)
      limit 1
    `,
    [userId, requestId],
  );

  return result.rows[0] ?? null;
}

export async function lockFriendRequest(
  db: Queryable,
  requestId: string,
): Promise<FriendRequestStateRecord | null> {
  const result = await db.query<FriendRequestStateRecord>(
    `
      select
        fr.id,
        fr.requester_id as "requesterId",
        fr.addressee_id as "addresseeId",
        fr.status
      from public.friend_requests fr
      where fr.id = $1
      for update
      limit 1
    `,
    [requestId],
  );

  return result.rows[0] ?? null;
}

export async function updateFriendRequestStatus(
  db: Queryable,
  requestId: string,
  status: FriendRequestStatus,
): Promise<void> {
  await db.query(
    `
      update public.friend_requests
      set status = $2
      where id = $1
    `,
    [requestId, status],
  );
}

export async function listFriendsForUser(
  db: Queryable,
  userId: string,
): Promise<FriendshipRecord[]> {
  const result = await db.query<FriendshipRecord>(
    `
      select
        f.id as "friendshipId",
        f.created_at as "createdAt",
        f.last_matched_at as "lastMatchedAt",
        p.id as "userId",
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.timezone
      from public.friendships f
      join public.profiles p
        on p.id = case
          when f.user_one_id = $1 then f.user_two_id
          else f.user_one_id
        end
      where f.user_one_id = $1
         or f.user_two_id = $1
      order by lower(p.display_name) asc, f.created_at desc
    `,
    [userId],
  );

  return result.rows;
}
