import { fetch as expoFetch } from 'expo/fetch';

import { API_BASE_URL, CatchupApiError } from '@/lib/catchup-api';

export type RealtimeEventEnvelope = {
  type: string;
  data: unknown;
  emittedAt: string;
};

function parseErrorMessage(text: string): { code: string; message: string } {
  if (!text) {
    return {
      code: 'realtime_request_failed',
      message: 'Realtime-Verbindung konnte nicht aufgebaut werden.',
    };
  }

  try {
    const parsed = JSON.parse(text) as {
      error?: {
        code?: string;
        message?: string;
      };
    };

    return {
      code: parsed.error?.code ?? 'realtime_request_failed',
      message: parsed.error?.message ?? 'Realtime-Verbindung konnte nicht aufgebaut werden.',
    };
  } catch {
    return {
      code: 'realtime_request_failed',
      message: text,
    };
  }
}

export async function openRealtimeStream(token: string, signal: AbortSignal) {
  const response = await expoFetch(`${API_BASE_URL}/realtime/stream`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    const { code, message } = parseErrorMessage(text);
    throw new CatchupApiError(response.status, code, message);
  }

  return response;
}

function parseEventBlock(block: string): RealtimeEventEnvelope | null {
  const normalized = block.replace(/\r/g, '');
  const lines = normalized.split('\n');
  let eventType = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue;
    }

    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const payload = dataLines.join('\n');

  try {
    const parsed = JSON.parse(payload) as Partial<RealtimeEventEnvelope>;
    if (parsed.type && parsed.emittedAt) {
      return {
        type: parsed.type,
        data: parsed.data ?? null,
        emittedAt: parsed.emittedAt,
      };
    }
  } catch {
    return {
      type: eventType,
      data: payload,
      emittedAt: new Date().toISOString(),
    };
  }

  return {
    type: eventType,
    data: payload,
    emittedAt: new Date().toISOString(),
  };
}

export async function readRealtimeEvents(
  response: Response,
  signal: AbortSignal,
  onEvent: (event: RealtimeEventEnvelope) => void,
) {
  const body = response.body;

  if (!body) {
    throw new Error('Realtime stream body is not available.');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (signal.aborted) {
      try {
        await reader.cancel();
      } catch {
        // Best effort on abort.
      }
      return;
    }

    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes('\n\n')) {
      const boundaryIndex = buffer.indexOf('\n\n');
      const block = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);
      const event = parseEventBlock(block);

      if (event) {
        onEvent(event);
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    const event = parseEventBlock(tail);
    if (event) {
      onEvent(event);
    }
  }
}
