import type { QuantumClient } from "./client.js";
import type {
  ChatRequest,
  ChatResponse,
  ChatUsage,
  ContentBlock,
  RawStreamEvent,
  StreamDelta,
  StreamEvent,
  StreamToolUse,
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

  const response = await client._doStreamRaw("/qai/v1/chat", body, signal);
  const reader = response.body;

  if (!reader) {
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
            event.tool_use = {
              id: String(raw.id ?? ""),
              name: String(raw.name ?? ""),
              input: (raw.input as Record<string, unknown>) ?? {},
            };
            break;

          case "usage":
            event.usage = {
              input_tokens: raw.input_tokens ?? 0,
              output_tokens: raw.output_tokens ?? 0,
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
    streamReader.releaseLock();
  }
}
