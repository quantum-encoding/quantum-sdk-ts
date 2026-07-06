import type { QuantumClient } from "./client.js";
import type {
  ChatRequest,
  ChatResponse,
  ChatUsage,
  ContentBlock,
  RawStreamEvent,
  StreamDelta,
  StreamEvent,
} from "./types.js";

/**
 * Returns concatenated text content from a ChatResponse, ignoring thinking and tool_use blocks.
 */
export function responseText(response: ChatResponse): string {
  return response.content
    .filter((b): b is ContentBlock & { type: "text" } => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

/**
 * Returns concatenated thinking content from a ChatResponse.
 */
export function responseThinking(response: ChatResponse): string {
  return response.content
    .filter(
      (b): b is ContentBlock & { type: "thinking" } => b.type === "thinking",
    )
    .map((b) => b.text ?? "")
    .join("");
}

/**
 * Returns all tool_use blocks from a ChatResponse.
 */
export function responseToolCalls(response: ChatResponse): ContentBlock[] {
  return response.content.filter((b) => b.type === "tool_use");
}

/**
 * Send a non-streaming chat request.
 * @internal — called by QuantumClient.chat()
 */
export async function chat(
  client: QuantumClient,
  req: ChatRequest,
): Promise<ChatResponse> {
  const body: ChatRequest = { ...req, stream: false };

  const { data, meta } = await client._doJSON<ChatResponse>(
    "POST",
    "/qai/v1/chat",
    body,
  );

  data.cost_ticks = data.cost_ticks || meta.costTicks;
  data.request_id = data.request_id || meta.requestId;
  if (!data.model) {
    data.model = meta.model;
  }
  // Mirror the X-Semantic-Cache header into the body field when the body
  // didn't carry it (the gateway sets both; prefer the body's own signal).
  if (data.cached === undefined && meta.cached) {
    data.cached = meta.cached;
  }

  return data;
}

/**
 * Send a streaming chat request. Returns an AsyncIterableIterator of StreamEvents.
 *
 * The last event will have done=true. Cancel the AbortSignal to abort early.
 *
 * @internal — called by QuantumClient.chatStream()
 */
export async function* chatStream(
  client: QuantumClient,
  req: ChatRequest,
  signal?: AbortSignal,
): AsyncIterableIterator<StreamEvent> {
  const body: ChatRequest = { ...req, stream: true };

  // Internal abort controller so that when this generator returns early
  // (consumer breaks out of the for-await, or [DONE] arrives), we abort the
  // upstream fetch and the server stops emitting — instead of orphan-running
  // the provider call to completion. Combined with any caller-supplied signal
  // via AbortSignal.any so a caller abort still propagates upstream.
  const internal = new AbortController();
  const upstreamSignal = combineSignals(internal.signal, signal);

  const response = await client._doStreamRaw("/qai/v1/chat", body, upstreamSignal);
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

      // Process complete lines from the buffer.
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) line in the buffer.
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          continue;
        }

        const payload = line.slice(6); // "data: ".length

        if (payload === "[DONE]") {
          yield { type: "done", done: true };
          return;
        }

        let raw: RawStreamEvent;
        try {
          raw = JSON.parse(payload) as RawStreamEvent;
        } catch {
          yield {
            type: "error",
            error: `parse SSE: invalid JSON`,
            done: false,
          };
          return;
        }

        const event: StreamEvent = { type: raw.type || "unknown", done: false };

        switch (raw.type) {
          case "content_delta":
          case "thinking_delta":
            event.delta = raw.delta as StreamDelta;
            break;

          case "tool_use":
            // Legacy atomic event — kept for back-compat with backends
            // that haven't yet shipped the triplet (v0.6+).
            event.tool_use = {
              id: String(raw.id ?? ""),
              name: String(raw.name ?? ""),
              input: (raw.input as Record<string, unknown>) ?? {},
            };
            break;

          case "tool_use_start":
            event.tool_use_start = {
              id: String(raw.id ?? ""),
              name: String(raw.name ?? ""),
            };
            break;

          case "tool_use_input_delta":
            event.tool_use_input_delta = {
              id: String(raw.id ?? ""),
              partial_json: String(raw.partial_json ?? ""),
            };
            break;

          case "tool_use_complete":
            event.tool_use_complete = {
              id: String(raw.id ?? ""),
              name: String(raw.name ?? ""),
              input: (raw.input as Record<string, unknown>) ?? {},
            };
            break;

          case "usage":
            event.usage = {
              input_tokens: raw.input_tokens ?? 0,
              // cached_tokens/reasoning_tokens are optional on the wire; the
              // gateway's Usage SSE event carries reasoning_tokens and the
              // body ChatUsage also carries cached_tokens. Surface both so
              // multi-turn billing audits reconcile against the body.
              cached_tokens:
                (raw as RawStreamEvent & { cached_tokens?: number })
                  .cached_tokens ?? 0,
              output_tokens: raw.output_tokens ?? 0,
              reasoning_tokens:
                (raw as RawStreamEvent & { reasoning_tokens?: number })
                  .reasoning_tokens ?? 0,
              cost_ticks: raw.cost_ticks ?? 0,
            } satisfies ChatUsage;
            break;

          case "error":
            event.error = raw.message;
            break;

          case "heartbeat":
            // pass through
            break;
        }

        yield event;
      }
    }
  } finally {
    // Abort the upstream fetch on every exit path (normal completion, early
    // return, consumer break, thrown error). Without this the server keeps
    // the SSE connection — and the underlying provider call — alive after
    // the consumer stops reading, leaking tokens and goroutines.
    internal.abort();
    streamReader.releaseLock();
  }
}

/**
 * Combine an internal abort signal with an optional caller signal. Prefers
 * AbortSignal.any when available (Node 20+, modern browsers); falls back to
 * a manual controller that fires when either source aborts.
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
