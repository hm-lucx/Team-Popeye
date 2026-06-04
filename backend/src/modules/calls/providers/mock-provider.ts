import { randomUUID } from 'node:crypto';

import { env } from '../../../config/env.js';
import type {
  CallJoinCredentialInput,
  CallJoinCredentialResult,
  CallProvider,
  CallSessionProvisionInput,
  CallSessionProvisionResult,
} from '../provider.js';

export class MockCallProvider implements CallProvider {
  readonly name = 'mock';

  async createSession(input: CallSessionProvisionInput): Promise<CallSessionProvisionResult> {
    return {
      provider: this.name,
      providerRoomId: input.roomName,
      roomUrl: `${env.appBaseUrl}/mock/calls/${input.roomName}`,
      roomExpiresAt: input.roomExpiresAt,
      metadata: {
        mock: true,
        roomName: input.roomName,
        matchId: input.matchId,
      },
    };
  }

  async issueJoinCredentials(input: CallJoinCredentialInput): Promise<CallJoinCredentialResult> {
    return {
      providerParticipantId: input.userId,
      joinUrl: input.roomUrl,
      token: `mock_${randomUUID()}`,
      tokenExpiresAt: input.expiresAt,
      metadata: {
        mock: true,
      },
    };
  }
}
