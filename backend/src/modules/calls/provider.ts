export type CallSessionProvisionInput = {
  roomName: string;
  roomExpiresAt: string;
  matchId: string;
};

export type CallSessionProvisionResult = {
  provider: string;
  providerRoomId: string;
  roomUrl: string;
  roomExpiresAt: string;
  metadata: Record<string, unknown>;
};

export type CallJoinCredentialInput = {
  roomName: string;
  roomUrl: string;
  userId: string;
  displayName: string;
  expiresAt: string;
};

export type CallJoinCredentialResult = {
  providerParticipantId: string;
  joinUrl: string;
  token: string | null;
  tokenExpiresAt: string;
  metadata: Record<string, unknown>;
};

export interface CallProvider {
  readonly name: string;
  createSession(input: CallSessionProvisionInput): Promise<CallSessionProvisionResult>;
  issueJoinCredentials(input: CallJoinCredentialInput): Promise<CallJoinCredentialResult>;
}
