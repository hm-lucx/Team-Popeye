import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

type FriendInviteAction =
  | {
      action: "create";
      inviteCode: string;
      message?: string;
    }
  | {
      action: "accept";
      requestId: string;
    }
  | {
      action: "decline";
      requestId: string;
    }
  | {
      action: "cancel";
      requestId: string;
    };

function normalizeInviteCode(rawInviteCode: string): string {
  return rawInviteCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapPostgrestError(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    return errorResponse(
      409,
      "duplicate_request",
      "Zwischen diesen beiden Nutzern existiert bereits eine offene Anfrage.",
    );
  }

  return errorResponse(400, "request_failed", error.message);
}

async function fetchAuthenticatedUser(authHeader: string) {
  const userClient = createUserClient(authHeader);
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);

  return { userClient, user, error };
}

async function createFriendRequest(
  userId: string,
  userClient: ReturnType<typeof createUserClient>,
  payload: Extract<FriendInviteAction, { action: "create" }>,
) {
  const adminClient = createAdminClient();
  const inviteCode = normalizeInviteCode(payload.inviteCode ?? "");

  if (inviteCode.length < 6) {
    return errorResponse(400, "invalid_invite_code", "Der Invite-Code ist ungueltig.");
  }

  const { data: requesterProfile, error: requesterError } = await userClient
    .from("profiles")
    .select("id, display_name, invite_code")
    .eq("id", userId)
    .single();

  if (requesterError || !requesterProfile) {
    return errorResponse(409, "profile_missing", "Fuer den Nutzer existiert noch kein Profil.");
  }

  const { data: addresseeProfile, error: addresseeError } = await adminClient
    .from("profiles")
    .select("id, display_name, avatar_url, timezone, invite_code")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (addresseeError) {
    return errorResponse(400, "invite_lookup_failed", addresseeError.message);
  }

  if (!addresseeProfile) {
    return errorResponse(404, "invite_not_found", "Kein Nutzer mit diesem Invite-Code gefunden.");
  }

  if (addresseeProfile.id === userId) {
    return errorResponse(409, "cannot_friend_self", "Du kannst dich nicht selbst adden.");
  }

  const { data: existingFriendship, error: friendshipError } = await adminClient
    .from("friendships")
    .select("id")
    .or(
      `and(user_one_id.eq.${userId},user_two_id.eq.${addresseeProfile.id}),and(user_one_id.eq.${addresseeProfile.id},user_two_id.eq.${userId})`,
    )
    .maybeSingle();

  if (friendshipError) {
    return errorResponse(400, "friendship_lookup_failed", friendshipError.message);
  }

  if (existingFriendship) {
    return errorResponse(409, "already_friends", "Ihr seid bereits bestaetigte Freunde.");
  }

  const { data: createdRequest, error: createError } = await userClient
    .from("friend_requests")
    .insert({
      requester_id: userId,
      addressee_id: addresseeProfile.id,
      invite_code_snapshot: inviteCode,
      message: payload.message?.trim() || null,
    })
    .select("id, requester_id, addressee_id, status, created_at, updated_at")
    .single();

  if (createError) {
    return mapPostgrestError(createError);
  }

  return jsonResponse(
    {
      data: {
        request: createdRequest,
        addressee: {
          id: addresseeProfile.id,
          display_name: addresseeProfile.display_name,
          avatar_url: addresseeProfile.avatar_url,
          timezone: addresseeProfile.timezone,
        },
      },
    },
    { status: 201 },
  );
}

async function updateFriendRequest(
  userClient: ReturnType<typeof createUserClient>,
  payload: Extract<FriendInviteAction, { action: "accept" | "decline" | "cancel" }>,
) {
  const requestId = payload.requestId?.trim();
  if (!requestId || !isUuid(requestId)) {
    return errorResponse(400, "invalid_request_id", "Die Request-ID ist ungueltig.");
  }

  const { data: existingRequest, error: requestLookupError } = await userClient
    .from("friend_requests")
    .select("id, requester_id, addressee_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestLookupError) {
    return errorResponse(400, "friend_request_lookup_failed", requestLookupError.message);
  }

  if (!existingRequest) {
    return errorResponse(404, "friend_request_not_found", "Die Anfrage wurde nicht gefunden.");
  }

  if (existingRequest.status !== "pending") {
    return errorResponse(
      409,
      "friend_request_not_pending",
      "Diese Anfrage kann nicht mehr veraendert werden.",
    );
  }

  const nextStatus =
    payload.action === "accept"
      ? "accepted"
      : payload.action === "decline"
        ? "declined"
        : "cancelled";

  const { data: updatedRequest, error: updateError } = await userClient
    .from("friend_requests")
    .update({ status: nextStatus })
    .eq("id", requestId)
    .select("id, requester_id, addressee_id, status, responded_at, updated_at")
    .single();

  if (updateError) {
    return mapPostgrestError(updateError);
  }

  let friendship = null;

  if (nextStatus === "accepted") {
    const { data: createdFriendship, error: friendshipError } = await userClient
      .from("friendships")
      .select("id, user_one_id, user_two_id, created_from_request_id, created_at")
      .eq("created_from_request_id", requestId)
      .maybeSingle();

    if (friendshipError) {
      return errorResponse(400, "friendship_lookup_failed", friendshipError.message);
    }

    friendship = createdFriendship;
  }

  return jsonResponse({
    data: {
      request: updatedRequest,
      friendship,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Nur POST wird unterstuetzt.");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse(401, "missing_auth_header", "Authorization Header fehlt.");
  }

  let payload: FriendInviteAction;
  try {
    payload = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request Body konnte nicht gelesen werden.");
  }

  try {
    const { userClient, user, error } = await fetchAuthenticatedUser(authHeader);

    if (error || !user) {
      return errorResponse(401, "invalid_session", "Sitzung ungueltig oder abgelaufen.");
    }

    if (payload.action === "create") {
      return await createFriendRequest(user.id, userClient, payload);
    }

    if (
      payload.action === "accept" ||
      payload.action === "decline" ||
      payload.action === "cancel"
    ) {
      return await updateFriendRequest(userClient, payload);
    }

    return errorResponse(400, "unsupported_action", "Diese Aktion wird nicht unterstuetzt.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return errorResponse(500, "internal_error", message);
  }
});
