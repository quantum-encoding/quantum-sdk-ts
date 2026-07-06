import type { QuantumClient } from "./client.js";
import type {
  AgentEvent,
  AgentRequest,
  ChatUsage,
  MissionEvent,
  MissionRequest,
} from "./types.js";

/**
 * SSE event types that mark the stream as terminal. The gateway emits these
 * in addition to (or instead of) the raw `done` type and the `[DONE]`
 * sentinel; treating them as terminal keeps the consumer's `done` flag
 * accurate for mission streams.
 */
const TERMINAL_TYPES = new Set([
  "done",
  "mission_completed",
  "mission_failed",
  "mission_budget_exhausted",
  "mission_budget_check_unavailable",
  "error",
]);

/**
 * Parse a raw SSE JSON event into a typed agent/mission event. Sets the
 * SDK-derived `done` flag on terminal event types and parses the optional
 * usage payload when present.
 */
function parseSSEEvent<T extends { type: string; done: boolean }>(
  raw: Record<string, unknown>,
): T {
  const event = { ...raw, done: false } as T;

  const rawType = raw.type as string | undefined;
  if (rawType !== undefined && TERMINAL_TYPES.has(rawType)) {
    (event as Record<string, unknown>).done = true;
  }

  // Parse usage if present (mission streams emit a final "usage" event).
  if (
    raw.input_tokens !== undefined ||
    raw.output_tokens !== undefined ||
    raw.cost_ticks !== undefined
  ) {
    (event as Record<string, unknown>).usage = {
      input_tokens: (raw.input_tokens as number) ?? 0,
      cached_tokens:
        (raw.cached_tokens as number | undefined) ?? undefined,
      output_tokens: (raw.output_tokens as number) ?? 0,
      reasoning_tokens:
        (raw.reasoning_tokens as number | undefined) ?? undefined,
      cost_ticks: (raw.cost_ticks as number) ?? 0,
    } satisfies ChatUsage;
  }

  return event;
}

/**
 * Combine an internal abort signal with an optional caller signal. Prefers
 * AbortSignal.any; falls back to a manual controller.
 * @internal
 */
function combineSignals(
  internal: AbortSignal,
  caller?: AbortSignal,
): AbortSignal | undefined {
  if (!caller) return internal;
  const anyFn = (AbortSignal as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof anyFn === "function") return anyFn([internal, caller]);
  const ctrl = new AbortController();
  const forward = () => ctrl.abort();
  internal.addEventListener("abort", forward, { once: true });
  caller.addEventListener("abort", forward, { once: true });
  return ctrl.signal;
}

/**
 * Pump an SSE stream from a fetch Response into typed events. Shared by
 * agentRun and missionRun. Aborts the upstream fetch on every exit path so a
 * consumer that breaks out of the for-await (or an error) stops the server
 * from orphan-running the provider call.
 *
 * @internal
 */
async function* pumpSSE<T extends { type: string; done: boolean }>(
  response: Response,
  internal: AbortController,
): AsyncIterableIterator<T> {
  const reader = response.body;

  if (!reader) {
    internal.abort();
    throw new Error("qai: response body is null");
  }

  const decoder = new TextDecoder();
  const streamReader = reader.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await streamReader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          continue;
        }

        const payload = line.slice(6);

        if (payload === "[DONE]") {
          yield { type: "done", done: true } as unknown as T;
          return;
        }

        let raw: Record<string, unknown>;
        try {
          raw = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          yield { type: "error", message: "parse SSE: invalid JSON", done: false } as unknown as T;
          return;
        }

        yield parseSSEEvent<T>(raw);
      }
    }
  } finally {
    // Abort the upstream fetch on every exit path so the server stops
    // emitting and the provider call is cancelled (the gateway's SSEWriter
    // cancels on socket close, propagating into the in-flight provider
    // Generate call). Without this a vanished consumer leaks tokens.
    internal.abort();
    streamReader.releaseLock();
  }
}

/**
 * Run a server-side agent orchestration. Streams SSE events.
 *
 * Targets POST /qai/v1/missions (the SSE conductor endpoint). The
 * orchestration body — {goal, conductor_model, workers(map), max_steps,
 * strategy, …} — is the missions request shape; /qai/v1/agent cannot accept
 * it (that route is a non-streaming tool-call passthrough that 400s with
 * "model is required" on this body).
 *
 * @internal — called by QuantumClient.agentRun()
 */
export async function* agentRun(
  client: QuantumClient,
  req: AgentRequest,
  signal?: AbortSignal,
): AsyncIterableIterator<AgentEvent> {
  const internal = new AbortController();
  const upstreamSignal = combineSignals(internal.signal, signal);
  const response = await client._doStreamRaw(
    "/qai/v1/missions",
    req,
    upstreamSignal,
  );
  yield* pumpSSE<AgentEvent>(response, internal);
}

/**
 * Run a full mission orchestration. Streams SSE events.
 * @internal — called by QuantumClient.missionRun()
 */
export async function* missionRun(
  client: QuantumClient,
  req: MissionRequest,
  signal?: AbortSignal,
): AsyncIterableIterator<MissionEvent> {
  const internal = new AbortController();
  const upstreamSignal = combineSignals(internal.signal, signal);
  const response = await client._doStreamRaw(
    "/qai/v1/missions",
    req,
    upstreamSignal,
  );
  yield* pumpSSE<MissionEvent>(response, internal);
}