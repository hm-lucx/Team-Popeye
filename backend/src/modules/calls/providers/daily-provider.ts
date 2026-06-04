import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';
import type {
  CallJoinCredentialInput,
  CallJoinCredentialResult,
  CallProvider,
  CallSessionProvisionInput,
  CallSessionProvisionResult,
} from '../provider.js';

type DailyRoomResponse = {
  name: string;
  url: string;
};

type DailyTokenResponse = {
  token: string;
};

function toUnixSeconds(isoString: string): number {
  return Math.floor(new Date(isoString).getTime() / 1000);
}

export class DailyCallProvider implements CallProvider {
  readonly name = 'daily';

  constructor(
    private readonly apiKey: string,
    private readonly apiUrl: string,
  ) {
    if (!apiKey) {
      throw new Error('DAILY_API_KEY is required when CALL_PROVIDER=daily.');
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(
        502,
        'daily_api_error',
        `Daily API request failed with status ${response.status}.`,
        errorText,
      );
    }

    return response.json() as Promise<T>;
  }

  private async getRoom(roomName: string): Promise<DailyRoomResponse> {
    return this.request<DailyRoomResponse>(`/rooms/${encodeURIComponent(roomName)}`, {
      method: 'GET',
    });
  }

  async createSession(input: CallSessionProvisionInput): Promise<CallSessionProvisionResult> {
    let room: DailyRoomResponse;

    try {
      room = await this.request<DailyRoomResponse>('/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: input.roomName,
          privacy: 'private',
          properties: {
            exp: toUnixSeconds(input.roomExpiresAt),
            eject_at_room_exp: true,
          },
        }),
      });
    } catch (error) {
      if (error instanceof AppError && error.code === 'daily_api_error') {
        try {
          room = await this.getRoom(input.roomName);
        } catch {
          throw error;
        }
      } else {
        throw error;
      }
    }

    return {
      provider: this.name,
      providerRoomId: room.name,
      roomUrl: room.url,
      roomExpiresAt: input.roomExpiresAt,
      metadata: {
        roomName: room.name,
        daily: true,
      },
    };
  }

  async issueJoinCredentials(input: CallJoinCredentialInput): Promise<CallJoinCredentialResult> {
    const tokenResponse = await this.request<DailyTokenResponse>('/meeting-tokens', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          room_name: input.roomName,
          user_name: input.displayName,
          user_id: input.userId,
          is_owner: false,
          exp: toUnixSeconds(input.expiresAt),
          eject_at_token_exp: true,
        },
      }),
    });

    return {
      providerParticipantId: input.userId,
      joinUrl: input.roomUrl,
      token: tokenResponse.token,
      tokenExpiresAt: input.expiresAt,
      metadata: {
        daily: true,
      },
    };
  }
}
