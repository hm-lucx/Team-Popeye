import { corsHeaders } from "./cors.ts";

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return jsonResponse(
    {
      error: {
        code,
        message,
        details: details ?? null,
      },
    },
    { status },
  );
}
