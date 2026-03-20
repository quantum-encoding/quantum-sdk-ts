/**
 * Realtime voice sessions via WebSocket.
 *
 * Connects to the QAI Realtime API for bidirectional audio streaming
 * with voice activity detection, transcription, and tool calling.
 */

import type { QuantumClient } from "./client.js";

// ── Types ──────────────────────────────────────────────────────────

/** Configuration for a realtime voice session. */
export interface RealtimeConfig {
  /** Voice to use (e.g. "Sal", "Eve", "Vesper"). Default: "Sal". */
  voice?: string;
  /** System instructions for the AI. */
  instructions?: string;
  /** PCM sample rate in Hz. Default: 24000. */
  sampleRate?: number;
  /** Tool definitions (xAI Realtime API format). */
  tools?: Record<string, unknown>[];
}

/** Parsed incoming event from the realtime API. */
export type RealtimeEvent =
  | { type: "session_ready" }
  | { type: "audio_delta"; delta: string }
  | { type: "transcript_delta"; delta: string; source: "input" | "output" }
  | { type: "transcript_done"; transcript: string; source: "input" | "output" }
  | { type: "speech_started" }
  | { type: "speech_stopped" }
  | { type: "function_call"; name: string; callId: string; arguments: string }
  | { type: "response_done" }
  | { type: "error"; message: string }
  | { type: "unknown"; raw: unknown };

// ── RealtimeSender ─────────────────────────────────────────────────

/** Write half of a realtime session. */
export class RealtimeSender {
  /** @internal */
  constructor(private ws: WebSocket) {}

  /** Send a base64-encoded PCM audio chunk. */
  sendAudio(base64Pcm: string): void {
    this.ws.send(
      JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Pcm,
      }),
    );
  }

  /** Send a text message and request a response. */
  sendText(text: string): void {
    this.ws.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      }),
    );
    this.ws.send(
      JSON.stringify({
        type: "response.create",
        response: { modalities: ["text", "audio"] },
      }),
    );
  }

  /** Send a function/tool call result back to the model. */
  sendFunctionResult(callId: string, output: string): void {
    this.ws.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output,
        },
      }),
    );
    this.ws.send(JSON.stringify({ type: "response.create" }));
  }

  /** Cancel the current response (interrupt). */
  cancelResponse(): void {
    this.ws.send(JSON.stringify({ type: "response.cancel" }));
  }

  /** Close the session gracefully. */
  close(): void {
    this.ws.close();
  }
}

// ── RealtimeReceiver ───────────────────────────────────────────────

/** Read half of a realtime session. */
export class RealtimeReceiver {
  private queue: RealtimeEvent[] = [];
  private resolve: ((value: RealtimeEvent | null) => void) | null = null;
  private closed = false;

  /** @internal */
  constructor(ws: WebSocket) {
    ws.addEventListener("message", (ev) => {
      const event = parseEvent(
        typeof ev.data === "string" ? ev.data : "",
      );
      if (this.resolve) {
        const r = this.resolve;
        this.resolve = null;
        r(event);
      } else {
        this.queue.push(event);
      }
    });

    ws.addEventListener("close", () => {
      this.closed = true;
      if (this.resolve) {
        const r = this.resolve;
        this.resolve = null;
        r(null);
      }
    });

    ws.addEventListener("error", () => {
      this.closed = true;
      if (this.resolve) {
        const r = this.resolve;
        this.resolve = null;
        r(null);
      }
    });
  }

  /** Receive the next event. Returns null when the connection closes. */
  recv(): Promise<RealtimeEvent | null> {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!);
    }
    if (this.closed) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  /** Async iterator support. */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<RealtimeEvent> {
    while (true) {
      const event = await this.recv();
      if (event === null) break;
      yield event;
    }
  }
}

// ── Ephemeral token flow (direct xAI connection) ───────────────────

/** Response from POST /qai/v1/realtime/session. */
export interface RealtimeSession {
  /** Ephemeral xAI token for direct WebSocket connection. */
  ephemeral_token: string;
  /** WebSocket URL to connect to (e.g. "wss://api.x.ai/v1/realtime"). */
  url: string;
  /** Session ID for billing (pass to realtimeEnd on disconnect). */
  session_id: string;
}

/**
 * Request an ephemeral token from the QAI proxy for direct xAI voice connection.
 * Call this before `realtimeConnectDirect` to get a scoped token.
 */
export async function realtimeSession(
  client: QuantumClient,
): Promise<RealtimeSession> {
  const { data } = await client._doJSON<RealtimeSession>("POST", "/qai/v1/realtime/session", {});
  return data;
}

/**
 * End a realtime session and finalize billing.
 * Call after disconnecting from the direct xAI WebSocket.
 */
export async function realtimeEnd(
  client: QuantumClient,
  sessionId: string,
  durationSeconds: number,
): Promise<void> {
  await client._doJSON("POST", "/qai/v1/realtime/end", {
    session_id: sessionId,
    duration_seconds: durationSeconds,
  });
}

/**
 * Refresh an ephemeral token for long sessions (>4 min).
 * Returns a new ephemeral token string.
 */
export async function realtimeRefresh(
  client: QuantumClient,
  sessionId: string,
): Promise<string> {
  const { data } = await client._doJSON<{ ephemeral_token: string }>(
    "POST", "/qai/v1/realtime/refresh", { session_id: sessionId },
  );
  return data.ephemeral_token;
}

/**
 * Connect directly to xAI's realtime API with an ephemeral token.
 * Much lower latency than the proxy path — no extra hop.
 * Use `realtimeSession()` first to get the token.
 */
export async function realtimeConnectDirect(
  ephemeralToken: string,
  config?: RealtimeConfig,
  wsUrl = "wss://api.x.ai/v1/realtime",
): Promise<[RealtimeSender, RealtimeReceiver]> {
  const ws = new WebSocket(wsUrl, ["realtime", `token-${ephemeralToken}`]);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Direct xAI WebSocket connection timed out (10s)"));
    }, 10_000);
    ws.addEventListener("open", () => { clearTimeout(timeout); resolve(); });
    ws.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Direct xAI WebSocket connection failed")); });
  });

  sendSessionUpdate(ws, config);
  return [new RealtimeSender(ws), new RealtimeReceiver(ws)];
}

// ── Connect (proxy path) ───────────────────────────────────────────

/**
 * Open a realtime voice session via the QAI proxy.
 * Returns [sender, receiver] for bidirectional communication.
 */
export async function realtimeConnect(
  client: QuantumClient,
  config?: RealtimeConfig,
): Promise<[RealtimeSender, RealtimeReceiver]> {
  const baseUrl = client._baseUrl;
  const apiKey = client._apiKey;

  // Convert https:// → wss://, http:// → ws://
  const wsBase = baseUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");

  const url = `${wsBase}/qai/v1/realtime`;

  // Browser WebSocket doesn't support custom headers, so pass token as protocol
  // For Node.js, we'd use the headers option — but the QAI proxy also accepts
  // the token as a query parameter for browser compatibility.
  const wsUrl = `${url}?token=${encodeURIComponent(apiKey)}`;

  const ws = new WebSocket(wsUrl);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("WebSocket connection timed out (15s)"));
    }, 15_000);

    ws.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve();
    });

    ws.addEventListener("error", (ev) => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection failed"));
    });
  });

  sendSessionUpdate(ws, config);
  return [new RealtimeSender(ws), new RealtimeReceiver(ws)];
}

// ── Session update helper ──────────────────────────────────────────

function sendSessionUpdate(ws: WebSocket, config?: RealtimeConfig): void {
  ws.send(
    JSON.stringify({
      type: "session.update",
      session: {
        voice: config?.voice ?? "Sal",
        instructions: config?.instructions ?? "",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "grok-2-audio" },
        turn_detection: { type: "server_vad" },
        tools: config?.tools ?? [],
      },
    }),
  );
}

// ── Event parsing ──────────────────────────────────────────────────

function parseEvent(data: string): RealtimeEvent {
  let v: any;
  try {
    v = JSON.parse(data);
  } catch {
    return { type: "unknown", raw: data };
  }

  const t = v.type as string;

  switch (t) {
    case "session.updated":
      return { type: "session_ready" };

    case "response.audio.delta":
    case "response.output_audio.delta":
      return { type: "audio_delta", delta: v.delta ?? "" };

    case "response.audio_transcript.delta":
    case "response.output_audio_transcript.delta":
      return { type: "transcript_delta", delta: v.delta ?? "", source: "output" };

    case "response.audio_transcript.done":
    case "response.output_audio_transcript.done":
      return { type: "transcript_done", transcript: v.transcript ?? "", source: "output" };

    case "conversation.item.input_audio_transcription.completed":
      return { type: "transcript_done", transcript: v.transcript ?? "", source: "input" };

    case "input_audio_buffer.speech_started":
      return { type: "speech_started" };

    case "input_audio_buffer.speech_stopped":
      return { type: "speech_stopped" };

    case "response.function_call_arguments.done":
      return {
        type: "function_call",
        name: v.name ?? "",
        callId: v.call_id ?? "",
        arguments: v.arguments ?? "",
      };

    case "response.done":
      return { type: "response_done" };

    case "error":
      return { type: "error", message: v.error?.message ?? v.message ?? "unknown error" };

    default:
      return { type: "unknown", raw: v };
  }
}
