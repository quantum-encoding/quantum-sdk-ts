import type { QuantumClient } from "./client.js";
import type {
  AgentEvent,
  AgentRequest,
  ChatUsage,
  MissionEvent,
  MissionRequest,
} from "./types.js";

/**
 * Parse a raw SSE JSON event into a typed agent/mission event.
 */
function parseSSEEvent<T extends { type: string; done: boolean }>(
  raw: Record<string, unknown>,
): T {
  const event = { ...raw, done: false } as T;

  if (raw.type === "done") {
    (event as Record<string, unknown>).done = true;
  }

  // Parse usage if present
  if (
    raw.input_tokens !== undefined ||
    raw.output_tokens !== undefined ||
    raw.cost_ticks !== undefined
  ) {
    (event as Record<string, unknown>).usage = {
      input_tokens: (raw.input_tokens as number) ?? 0,
      output_tokens: (raw.output_tokens as number) ?? 0,
      cost_ticks: (raw.cost_ticks as number) ?? 0,
    } satisfies ChatUsage;
  }

  return event;
}

/**
 * Run a server-side agent orchestration. Streams SSE events.
 * @internal — called by QuantumClient.agentRun()
 */
export async function* agentRun(
  client: QuantumClient,
  req: AgentRequest,
  signal?: AbortSignal,
): AsyncIterableIterator<AgentEvent> {
  const response = await client._doStreamRaw("/qai/v1/agent", req, signal);
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

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          continue;
        }

        const payload = line.slice(6);

        if (payload === "[DONE]") {
          yield { type: "done", done: true };
          return;
        }

        let raw: Record<string, unknown>;
        try {
          raw = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          yield { type: "error", message: "parse SSE: invalid JSON", done: false };
          return;
        }

        yield parseSSEEvent<AgentEvent>(raw);
      }
    }
  } finally {
    streamReader.releaseLock();
  }
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
  const response = await client._doStreamRaw("/qai/v1/missions", req, signal);
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

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          continue;
        }

        const payload = line.slice(6);

        if (payload === "[DONE]") {
          yield { type: "done", done: true };
          return;
        }

        let raw: Record<string, unknown>;
        try {
          raw = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          yield { type: "error", message: "parse SSE: invalid JSON", done: false };
          return;
        }

        yield parseSSEEvent<MissionEvent>(raw);
      }
    }
  } finally {
    streamReader.releaseLock();
  }
}
