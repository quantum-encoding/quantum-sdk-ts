// HeyGen Avatar Realtime (Broadcast) sessions.
//
// A realtime session makes an avatar speak live and publishes a plain HLS
// stream (720p). Sessions are PREPAID: the entire max_duration_seconds block
// is charged at create time and is NOT refunded on early cancel (cancelling
// only stops the upstream meter).
//
// Recommended flow:
// 1. createAvatarRealtimeSession() → stream_id
// 2. Poll getAvatarRealtimeSession() (~2s) until status == "streaming",
//    then play hls_url
// 3. For text_stream sessions, append text with sendAvatarRealtimeText()
//    and close with { final: true } (idle timeout is ~30s without new text)
// 4. cancelAvatarRealtimeSession() as soon as you're done
//
// Not to be confused with the WebSocket voice realtime API in realtime.ts.

import type { QuantumClient } from "./client.js";
import type {
  AvatarRealtimeCancelResponse,
  AvatarRealtimeCreateResponse,
  AvatarRealtimeRequest,
  AvatarRealtimeStatusResponse,
  AvatarRealtimeTextRequest,
  AvatarRealtimeTextResponse,
} from "./types.js";

/**
 * Create a live avatar realtime session (HeyGen Broadcast).
 *
 * PREPAID: the entire max_duration_seconds block (1–3600 s) is charged at
 * create time; cancelling early does NOT refund.
 *
 * @internal — called by QuantumClient.createAvatarRealtimeSession()
 */
export async function createAvatarRealtimeSession(
  client: QuantumClient,
  req: AvatarRealtimeRequest,
): Promise<AvatarRealtimeCreateResponse> {
  const { data, meta } = await client._doJSON<AvatarRealtimeCreateResponse>(
    "POST",
    "/qai/v1/avatar/realtime",
    req,
  );

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (data.balance_after === undefined && meta.balanceAfter !== undefined) {
    data.balance_after = meta.balanceAfter;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * Get the live status of an avatar realtime session.
 *
 * Poll (~2s) until status == "streaming", then play hls_url.
 * "completed" and "error" are terminal.
 *
 * @internal — called by QuantumClient.getAvatarRealtimeSession()
 */
export async function getAvatarRealtimeSession(
  client: QuantumClient,
  streamId: string,
): Promise<AvatarRealtimeStatusResponse> {
  const { data } = await client._doJSON<AvatarRealtimeStatusResponse>(
    "GET",
    `/qai/v1/avatar/realtime/${encodeURIComponent(streamId)}`,
    undefined,
  );

  return data;
}

/**
 * Append a text delta to a text_stream session (or close it with
 * `{ final: true }`).
 *
 * Appending after close fails upstream with a 410 provider_error.
 *
 * @internal — called by QuantumClient.sendAvatarRealtimeText()
 */
export async function sendAvatarRealtimeText(
  client: QuantumClient,
  streamId: string,
  req: AvatarRealtimeTextRequest,
): Promise<AvatarRealtimeTextResponse> {
  // Match the wire contract: empty delta is omitted entirely; `final` is
  // always sent (default false).
  const body: Record<string, unknown> = { final: req.final ?? false };
  if (req.delta) body.delta = req.delta;

  const { data } = await client._doJSON<AvatarRealtimeTextResponse>(
    "POST",
    `/qai/v1/avatar/realtime/${encodeURIComponent(streamId)}/text`,
    body,
  );

  return data;
}

/**
 * Terminate an avatar realtime session early (idempotent; no refund — this
 * only stops HeyGen's upstream meter).
 *
 * @internal — called by QuantumClient.cancelAvatarRealtimeSession()
 */
export async function cancelAvatarRealtimeSession(
  client: QuantumClient,
  streamId: string,
): Promise<AvatarRealtimeCancelResponse> {
  const { data } = await client._doJSON<AvatarRealtimeCancelResponse>(
    "POST",
    `/qai/v1/avatar/realtime/${encodeURIComponent(streamId)}/cancel`,
    undefined,
  );

  return data;
}
