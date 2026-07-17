// ── Constants ──────────────────────────────────────────────────────

/** Default production Quantum AI API endpoint. */
export const DEFAULT_BASE_URL = "https://api.quantumencoding.ai";

/** Number of ticks in one US dollar (10 billion). */
export const TICKS_PER_USD = 10_000_000_000n;

// ── Client Options ─────────────────────────────────────────────────

export interface ClientOptions {
  /** Override the default API base URL. */
  baseUrl?: string;

  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof globalThis.fetch;

  /**
   * Per-request timeout in milliseconds for non-streaming (buffered) calls.
   * Image/video generation returns a single JSON blob only when the provider
   * finishes, so the request must outlive the whole generation. Defaults to
   * 600_000 (10 min), above the backend's 5-minute media deadline so the server
   * errors first. Streaming requests are never timed out by the client.
   */
  timeoutMs?: number;

  /**
   * Default idempotency key strategy. When true (default), every mutating
   * request auto-generates a UUID v4 idempotency key via crypto.randomUUID()
   * so a network-flake retry is safe against double-billing. Set to false to
   * disable auto-generation (callers must pass their own key to be protected).
   * Has no effect on GET requests.
   */
  idempotencyKey?: boolean;
}

/** Default per-request timeout (ms) for buffered calls. @see ClientOptions.timeoutMs */
export const DEFAULT_TIMEOUT_MS = 600_000;

// ── Response Metadata ──────────────────────────────────────────────

/** Common metadata parsed from API response headers. */
export interface ResponseMeta {
  costTicks: number;
  requestId: string;
  cost_ticks?: number;
  request_id?: string;
  model: string;
  /** Wallet balance after this request, in ticks (X-QAI-Balance-After). */
  balanceAfter?: number;
  /** True when served from the semantic cache (X-Semantic-Cache: hit). */
  cached?: boolean;
}

// ── Chat ───────────────────────────────────────────────────────────

export interface ChatRequest {
  /** Model ID that determines provider routing (e.g. "claude-sonnet-4-6"). */
  model: string;

  /** Conversation history. */
  messages: ChatMessage[];

  /** Functions the model can call. */
  tools?: ChatTool[];

  /** Enable server-sent event streaming. Use chatStream() instead of chat(). */
  stream?: boolean;

  /** Controls randomness (0.0-2.0). */
  temperature?: number;

  /** Limits the response length. */
  max_tokens?: number;

  /**
   * Controls tool calling: "auto" (default), "any" (force a tool call),
   * "none", or a specific tool name.
   */
  tool_choice?: string;

  /**
   * JSON Schema constraining the response to valid JSON matching it.
   * Supported by Anthropic, OpenAI, xAI, Gemini, and Vertex AI.
   */
  output_schema?: Record<string, unknown>;

  /**
   * How much chain-of-thought a reasoning model runs before answering:
   * "none", "low", "medium", "high", "xhigh", "max". Omit for the provider
   * default (medium on GPT-5.5+). "max" is Anthropic Opus 4.7+ only and will
   * 400 on OpenAI. An unknown value is rejected with 400.
   */
  reasoning_effort?: string;

  /**
   * Vertex resource name of a previously created context cache (e.g.
   * "cachedContents/abc123"). Cached content is billed at the cached-read
   * rate and need not be re-sent. Gemini-only; the cache's model must match.
   */
  cached_content?: string;

  /**
   * Provider-specific settings (e.g. Anthropic thinking, xAI search).
   * Example: { anthropic: { thinking: { budget_tokens: 10000 } } }
   */
  provider_options?: Record<string, Record<string, unknown>>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  content_blocks?: ContentBlock[];
  tool_call_id?: string;
  is_error?: boolean;
  /**
   * Provider-side reasoning state (OpenAI Responses API). Echo back the
   * `phase` from the previous turn's ChatResponse so reasoning state
   * round-trips across replay. Omit for providers without phase.
   */
  phase?: string;
}

/**
 * Tool definition the model can call. Wire shape is FLAT — the gateway
 * (convert.go ChatTool) decodes {name, description, parameters, strict}
 * directly with no custom unmarshaler. The nested OpenAI-style
 * {type:"function", function:{...}} shape is NOT accepted and silently
 * drops the whole tool list.
 */
export interface ChatTool {
  /** Tool name the model emits to invoke this tool. */
  name: string;
  /** Human-readable description of what the tool does. */
  description?: string;
  /** JSON Schema describing the tool's arguments. */
  parameters?: Record<string, unknown>;
  /** When true, the provider guarantees schema-strict argument validation
   *  (Anthropic + OpenAI). Other providers ignore it. */
  strict?: boolean;
}

export interface ContentBlock {
  type: string;
  /** Canonical block type (e.g. "text", "thinking", "tool_use"). */
  block_type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  /** Gemini thought signature — must be echoed back with tool results. */
  thought_signature?: string;
  /** Base64-encoded content for "image" and "file" blocks. */
  data?: string;
  /** MIME type for "image"/"file" blocks (e.g. "image/png", "application/pdf"). */
  mime_type?: string;
  /** Original filename for "file" blocks. */
  file_name?: string;
  /** Remote resource URL for "file_uri" blocks (YouTube, gs://, etc.). */
  file_uri?: string;
  [key: string]: unknown;
}

export interface ChatUsage {
  input_tokens: number;
  /** Portion of input_tokens served from a prompt cache (cheaper rate). */
  cached_tokens?: number;
  output_tokens: number;
  /** Chain-of-thought tokens billed on top of output_tokens (Gemini/Vertex). */
  reasoning_tokens?: number;
  cost_ticks: number;
}

/**
 * Canonical `stop_reason` values emitted by the gateway. Every provider's
 * native finish reason is normalized into this Anthropic-flavored space, so
 * comparing `ChatResponse.stop_reason` against these works regardless of
 * which model served the request. A provider-specific reason the gateway
 * cannot map passes through lowercased — treat any other value as terminal.
 */
export const StopReason = {
  /** Natural completion. */
  EndTurn: "end_turn",
  /** Model is requesting tool execution (tool_use blocks present). */
  ToolUse: "tool_use",
  /** Output token cap reached — the response is truncated. */
  MaxTokens: "max_tokens",
  /** A requested stop sequence matched. */
  StopSequence: "stop_sequence",
  /** Provider-side safety/policy stop. */
  ContentFilter: "content_filter",
  /** A safety classifier declined the request; discard any partial output. */
  Refusal: "refusal",
  /** Provider reported a terminal failure. */
  Error: "error",
} as const;

/** Union of the canonical {@link StopReason} values. */
export type StopReasonValue = (typeof StopReason)[keyof typeof StopReason];

export interface ChatResponse {
  id: string;
  model: string;
  content: ContentBlock[];
  usage: ChatUsage;
  stop_reason: string;
  /** Citations from web search grounding (when search is enabled). */
  citations?: Citation[];
  /**
   * True when this response was served from the gateway semantic cache
   * (mirrors the X-Semantic-Cache header). Omitted/false on fresh provider
   * responses.
   */
  cached?: boolean;
  /**
   * Provider-side reasoning-state tag (OpenAI Responses API). Echo it back on
   * the next turn's assistant ChatMessage.phase to preserve reasoning state.
   * Absent when the provider doesn't surface phase.
   */
  phase?: string;
  request_id: string;
  cost_ticks: number;
}

// ── Streaming ─────────────────────────────────────────────────────

export interface StreamDelta {
  text?: string;
}

export interface StreamToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** New since v0.6: tool-use streaming triplet. */
export interface StreamToolUseStart {
  id: string;
  name: string;
}
export interface StreamToolUseInputDelta {
  id: string;
  /** Raw JSON fragment — may not parse on its own; accumulate until tool_use_complete. */
  partial_json: string;
}
export interface StreamToolUseComplete {
  id: string;
  name: string;
  /** Server-accumulated, fully-parsed tool arguments. */
  input: Record<string, unknown>;
}

export interface StreamEvent {
  type: string;
  /** Event type (e.g. "content_delta", "thinking_delta", "tool_use_start",
   *  "tool_use_input_delta", "tool_use_complete", "tool_use" (legacy),
   *  "usage", "error", "done"). */
  event_type?: string;
  delta?: StreamDelta;
  /** Populated for the legacy atomic "tool_use" event. New code should
   *  prefer the triplet (tool_use_start / tool_use_input_delta /
   *  tool_use_complete). */
  tool_use?: StreamToolUse;
  /** Populated for "tool_use_start" events. */
  tool_use_start?: StreamToolUseStart;
  /** Populated for "tool_use_input_delta" events. */
  tool_use_input_delta?: StreamToolUseInputDelta;
  /** Populated for "tool_use_complete" events. */
  tool_use_complete?: StreamToolUseComplete;
  usage?: ChatUsage;
  error?: string;
  done?: boolean;
}

/** Raw SSE event before parsing into StreamEvent. */
export interface RawStreamEvent {
  type?: string;
  delta?: StreamDelta;
  tool_use?: StreamToolUse;
  /** Fields shared by the triplet — flattened in the wire format. */
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  partial_json?: string;
  usage?: ChatUsage;
  message?: string;
  input_tokens?: number;
  output_tokens?: number;
  cost_ticks?: number;
  [key: string]: unknown;
}

// ── Session Chat ──────────────────────────────────────────────────

export interface SessionChatRequest {
  /** Session ID. Omit to create a new session. */
  session_id?: string;

  /** Model to use for generation. */
  model?: string;

  /** The user message. */
  message: string;

  /** Tools the model can call. */
  tools?: ChatTool[];

  /** Tool results from previous calls. */
  tool_results?: SessionToolResult[];

  /** Enable streaming. */
  stream?: boolean;

  /** System prompt. */
  system_prompt?: string;

  /** Context management configuration. */
  context_config?: ContextConfig;

  /**
   * Reasoning depth: "none", "low", "medium", "high", "xhigh". Omit for the
   * provider default. Mirrors ChatRequest.reasoning_effort.
   */
  reasoning_effort?: string;

  /** Provider-specific settings. */
  provider_options?: Record<string, Record<string, unknown>>;
}

export interface SessionToolResult {
  tool_call_id: string;
  content: string;
  is_error?: boolean;
}

export interface ContextConfig {
  max_tokens?: number;
  auto_compact?: boolean;
}

export interface ContextMetadata {
  turn_count: number;
  estimated_tokens: number;
  compacted: boolean;
  compaction_note?: string;
}

export interface SessionChatResponse {
  session_id: string;
  response: ChatResponse;
  context: ContextMetadata;
}

// ── Agent (orchestration via /qai/v1/missions) ─────────────────────

/**
 * Request for {@link QuantumClient.agentRun} — a server-side multi-worker
 * agent orchestration streamed over SSE.
 *
 * agentRun targets POST /qai/v1/missions (the SSE conductor endpoint). The
 * earlier shape — {task, conductor_model, workers[], max_steps} streamed at
 * POST /qai/v1/agent — could not work: /qai/v1/agent is a NON-STREAMING
 * single-shot tool-call passthrough that 400s with "model is required" on
 * this orchestration body. The orchestration shape belongs on /missions,
 * where Workers is a MAP keyed by worker name (not a list).
 */
export interface AgentRequest {
  /** High-level task/goal for the agent to accomplish (required). */
  goal: string;

  /** Conductor model that plans + reviews (default: claude-sonnet-4-6). */
  conductor_model?: string;

  /** Override the conductor's cost tier: "cheap", "mid", "expensive". */
  conductor_tier?: string;

  /** Execution strategy: "wave" (default), "dag", "mapreduce", "refinement",
   *  "branch", "codegen", "coding_team", "security_team", "pipeline". */
  strategy?: string;

  /** Worker team, keyed by worker name. Empty = cost-optimized defaults. */
  workers?: Record<string, AgentWorkerConfig>;

  /** Maximum orchestration steps (default 25, hard ceiling 50). */
  max_steps?: number;

  /** Conductor system prompt. */
  system_prompt?: string;

  /** Existing session ID for context continuity. */
  session_id?: string;

  /** Conductor auto-plans before executing when true (default true). */
  auto_plan?: boolean;

  /** Session context management. */
  context_config?: ContextConfig;

  // ── Codegen-specific (strategy: "codegen") ──

  /** Where to write generated files (codegen). */
  workspace_path?: string;
  /** Build command for codegen verification (e.g. "npm run build"). */
  build_command?: string;
  /** Route workers through a deployed Vertex endpoint (codegen). */
  deployment_id?: string;

  // ── Context material ──

  /** User-supplied reference material prepended to the goal when
   *  use_context is true. */
  context?: string;
  /** When true, prepend {@link context} to the goal. */
  use_context?: boolean;
}

/**
 * Worker in an agent orchestration. Mirrors the backend MissionWorkerConfig
 * (routes_missions.go): workers are keyed by name in a map, and each carries
 * its own model + tier + escalation policy — NOT tools or a system_prompt
 * (those belong on the non-streaming /qai/v1/agent passthrough).
 */
export interface AgentWorkerConfig {
  /** Model ID this worker runs (e.g. "grok-4-1-fast-non-reasoning"). */
  model: string;
  /** Cost tier: "cheap", "mid", "expensive". */
  tier: string;
  /** What this worker does. */
  description?: string;
  /** Worker to fall back to when this one fails after max_retries. */
  escalate_to?: string;
  /** Failures before escalating (default 1 = escalate on first failure). */
  max_retries?: number;
}

/**
 * A single event from an agent SSE stream. Field set matches the gateway's
 * mission events ({type, mission_id, task_id, message, …}) plus the
 * agentruntime.Event fields ({role, content, data, timestamp, index}).
 * `done` is SDK-derived: true on terminal events (done, mission_completed,
 * mission_failed, error) and the [DONE] sentinel.
 */
export interface AgentEvent {
  type: string;
  /** SDK-derived terminal flag. */
  done: boolean;
  /** Agent runtime role (e.g. "conductor", "worker"). */
  role?: string;
  /** Assistant/content payload. */
  content?: string;
  /** Structured data from the agent runtime (flattened into the SSE event). */
  data?: Record<string, unknown>;
  /** Event timestamp (RFC3339). */
  timestamp?: string;
  /** Event index in the orchestration. */
  index?: number;
  /** Mission ID (mission events). */
  mission_id?: string;
  /** Task ID within a mission (mission events). */
  task_id?: string;
  /** Human-readable message (mission events). */
  message?: string;
  /** Worker name that emitted this event. */
  worker?: string;
  /** Legacy atomic tool-use event payload. */
  tool_use?: StreamToolUse;
  /** Error message on "error" events. */
  error?: string;
  /** Parsed token/cost usage (present on "usage" events). */
  usage?: ChatUsage;
  [key: string]: unknown;
}

// ── Non-streaming agent passthrough (/qai/v1/agent) ────────────────

/**
 * Request for {@link QuantumClient.agent} — a stateless, non-streaming
 * tool-call passthrough. The server does NOT execute tools; it returns
 * {id, model, stop_reason, content, tool_use, usage} and the caller runs
 * tool_use locally and replays the result on the next request.
 *
 * This is the actual contract at POST /qai/v1/agent (routes_agent.go):
 * {model, messages, tools, capabilities, system_prompt}. The `stream`
 * field is accepted-but-ignored.
 */
export interface AgentPassthroughRequest {
  /** Model ID (required). */
  model: string;
  /** Conversation history. */
  messages: ChatMessage[];
  /** Flat tool definitions the model may call. */
  tools?: ChatTool[];
  /** Capability allowlist filtering which tools the model sees:
   *  omit = all tools, [] = no tools (Safe Mode), non-empty = allowlist. */
  capabilities?: string[];
  /** System prompt. */
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

/** Response from the non-streaming /qai/v1/agent passthrough. */
export interface AgentPassthroughResponse {
  id: string;
  model: string;
  stop_reason: string;
  content: ContentBlock[];
  /** tool_use blocks the caller must execute locally. */
  tool_use?: ContentBlock[];
  usage?: ChatUsage;
  request_id: string;
  cost_ticks: number;
}

// ── Mission ────────────────────────────────────────────────────────

/**
 * Request for {@link QuantumClient.missionRun} — the full-project SSE
 * orchestration endpoint (POST /qai/v1/missions). Workers is a MAP keyed by
 * worker name, matching the backend MissionRequest (routes_missions.go).
 */
export interface MissionRequest {
  /** High-level goal for the mission (required). */
  goal: string;

  /** Strategy: "wave" (default), "dag", "mapreduce", "refinement", "branch",
   *  "codegen", "coding_team", "security_team", "pipeline". */
  strategy?: string;

  /** Conductor model (default: claude-sonnet-4-6). */
  conductor_model?: string;

  /** Conductor cost tier: "cheap", "mid", "expensive" (default "expensive"). */
  conductor_tier?: string;

  /** Worker team keyed by worker name. Empty = cost-optimized defaults. */
  workers?: Record<string, MissionWorkerConfig>;

  /** Maximum orchestration steps (default 25, hard ceiling 50). */
  max_steps?: number;

  /** Conductor system prompt. */
  system_prompt?: string;

  /** Existing session ID for context continuity. */
  session_id?: string;

  /** Conductor auto-plans before executing when true (default true). */
  auto_plan?: boolean;

  /** Session context management. */
  context_config?: ContextConfig;

  // ── Codegen-specific (strategy: "codegen") ──
  /** Where to write generated files. */
  workspace_path?: string;
  /** Build command for codegen verification (e.g. "npm run build"). */
  build_command?: string;
  /** Route workers through a deployed Vertex endpoint. */
  deployment_id?: string;

  // ── Context material ──
  /** Reference material prepended to the goal when use_context is true. */
  context?: string;
  /** When true, prepend {@link context} to the goal. */
  use_context?: boolean;
}

/**
 * Worker in a mission. Same shape as {@link AgentWorkerConfig} — kept as a
 * distinct type for call-site clarity. No tools/system_prompt: those belong
 * on the non-streaming /qai/v1/agent passthrough.
 */
export interface MissionWorkerConfig {
  /** Model ID this worker runs. */
  model: string;
  /** Cost tier: "cheap", "mid", "expensive". */
  tier: string;
  /** What this worker does. */
  description?: string;
  /** Worker to fall back to when this one fails after max_retries. */
  escalate_to?: string;
  /** Failures before escalating (default 1). */
  max_retries?: number;
}

/**
 * A single event from a mission SSE stream. Same field set as
 * {@link AgentEvent}; `done` is SDK-derived on terminal events.
 */
export interface MissionEvent {
  type: string;
  /** SDK-derived terminal flag. */
  done: boolean;
  role?: string;
  content?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  index?: number;
  /** Mission ID. */
  mission_id?: string;
  /** Task ID within the mission. */
  task_id?: string;
  /** Human-readable message. */
  message?: string;
  worker?: string;
  tool_use?: StreamToolUse;
  error?: string;
  usage?: ChatUsage;
  [key: string]: unknown;
}

// ── Image ──────────────────────────────────────────────────────────

export interface ImageRequest {
  /** Model for image generation. */
  model: string;

  /** Text prompt describing the image. */
  prompt: string;

  /** Number of images to generate. */
  n?: number;

  /** Number of images to generate (alias). */
  count?: number;

  /** Image size (e.g. "1024x1024"). */
  size?: string;

  /** Aspect ratio (e.g. "16:9", "1:1"). */
  aspect_ratio?: string;

  /** Quality level (e.g. "standard", "hd"). */
  quality?: string;

  /** Image format (e.g. "png", "jpeg", "webp"). */
  output_format?: string;

  /** Style preset (e.g. "vivid", "natural"). */
  style?: string;

  /** Background mode (e.g. "auto", "transparent", "opaque"). */
  background?: string;

  /** Image URL or data URI for image-to-3D conversion (Meshy). */
  image_url?: string;

  /** Mesh topology: "triangle" or "quad". */
  topology?: string;

  /** Target polygon count (100-300,000). */
  target_polycount?: number;

  /** Symmetry mode: "auto", "on", or "off". */
  symmetry_mode?: string;

  /** Pose mode: "", "a-pose", or "t-pose". */
  pose_mode?: string;

  /** Generate PBR texture maps. */
  enable_pbr?: boolean;
}

export interface GeneratedImage {
  url?: string;
  b64_json?: string;
  /** Base64-encoded image data. */
  base64?: string;
  /** Image format (e.g. "png", "jpeg"). */
  format?: string;
  /** Image index within the batch. */
  index?: number;
}

export interface ImageResponse {
  images: GeneratedImage[];
  model: string;
  request_id: string;
  cost_ticks: number;
}

export interface ImageEditRequest {
  /** Model for image editing. */
  model: string;

  /** Text prompt describing the edit. */
  prompt: string;

  /** Base64-encoded source image. */
  image?: string;

  /** Base64-encoded input images. */
  input_images?: string[];

  /** Optional mask image for inpainting. */
  mask?: string;

  /** Image size. */
  size?: string;

  /** Number of images. */
  n?: number;

  /** Number of edited images to generate. */
  count?: number;
}

export interface ImageEditResponse {
  images: GeneratedImage[];
  model: string;
  request_id: string;
  cost_ticks: number;
}

// ── Audio ──────────────────────────────────────────────────────────

export interface TTSRequest {
  /** Model for text-to-speech. */
  model?: string;

  /** Text to speak. */
  text: string;

  /** Voice ID. */
  voice?: string;

  /** Output format (e.g. "mp3", "wav"). */
  format?: string;

  /** Speaking speed. */
  speed?: number;
}

export interface TTSResponse {
  audio_url: string;
  format: string;
  duration_seconds: number;
  request_id: string;
  cost_ticks: number;
}

export interface STTRequest {
  /** Model for speech-to-text. */
  model?: string;

  /** Base64-encoded audio data. */
  audio: string;

  /** Audio format (e.g. "wav", "mp3"). */
  format?: string;

  /** BCP-47 language code. */
  language?: string;
}

export interface STTResponse {
  text: string;
  language: string;
  duration_seconds: number;
  request_id: string;
  cost_ticks: number;
}

export interface MusicRequest {
  /** Text prompt describing the music. */
  prompt: string;

  /** Duration in seconds. */
  duration?: number;

  /** Target duration in seconds. */
  duration_seconds?: number;

  /** Model to use for music generation. */
  model?: string;
}

export interface MusicClip {
  audio_url?: string;
  title?: string;
  tags?: string;
  duration_seconds?: number;
  /** Base64-encoded audio data. */
  base64?: string;
  /** Audio format (e.g. "mp3", "wav"). */
  format?: string;
  /** Audio file size. */
  size_bytes?: number;
  /** Clip index within the batch. */
  index?: number;
}

export interface MusicResponse {
  clips?: MusicClip[];
  /** Generated music clips. */
  audio_clips?: MusicClip[];
  /** Model that generated the music. */
  model?: string;
  request_id: string;
  cost_ticks: number;
}

export interface SoundEffectRequest {
  /** Text prompt describing the sound effect. */
  text?: string;

  /** Text prompt describing the sound effect (alias). */
  prompt?: string;

  /** Duration in seconds. */
  duration_seconds?: number;

  /** Whether to generate multiple variations. */
  prompt_influence?: number;
}

export interface SoundEffectResponse {
  audio_url?: string;
  /** Base64-encoded audio data. */
  audio_base64?: string;
  /** Audio format (e.g. "mp3"). */
  format?: string;
  /** File size in bytes. */
  size_bytes?: number;
  /** Model used. */
  model?: string;
  request_id: string;
  cost_ticks: number;
}

// ── Advanced Audio ────────────────────────────────────────────────

export interface DialogueVoice {
  voice_id: string;
  name?: string;
}

export interface DialogueRequest {
  /** Script with speaker names and lines. */
  script?: string;

  /** Full dialogue script text. */
  text?: string;

  /** Voice mapping (speaker name -> voice ID). */
  voices: Record<string, string> | DialogueVoice[];

  /** Model for dialogue generation. */
  model?: string;

  /** Output audio format. */
  output_format?: string;

  /** Seed for reproducible generation. */
  seed?: number;
}

export interface DialogueResponse {
  audio_url: string;
  duration_seconds: number;
  request_id: string;
  cost_ticks: number;
}

export interface SpeechToSpeechRequest {
  /** Base64-encoded source audio. */
  audio?: string;

  /** Base64-encoded source audio (canonical). */
  audio_base64?: string;

  /** Target voice ID. */
  voice_id?: string;

  /** Target voice. */
  voice?: string;

  /** Model for voice conversion. */
  model?: string;

  /** Output audio format. */
  output_format?: string;
}

export interface SpeechToSpeechResponse {
  audio_url: string;
  duration_seconds: number;
  request_id: string;
  cost_ticks: number;
}

export interface IsolateVoiceRequest {
  /** Base64-encoded audio. */
  audio: string;
}

export interface IsolateVoiceResponse {
  audio_url: string;
  request_id: string;
  cost_ticks: number;
}

export interface RemixVoiceRequest {
  /** Base64-encoded audio. */
  audio: string;

  /** Target voice ID. */
  voice_id: string;
}

export interface RemixVoiceResponse {
  audio_url: string;
  request_id: string;
  cost_ticks: number;
}

export interface DubRequest {
  /** Base64-encoded audio/video to dub. */
  audio?: string;

  /** Base64-encoded source audio or video (canonical). */
  audio_base64?: string;

  /** Original filename (helps detect format). */
  filename?: string;

  /** Target language code. */
  target_lang?: string;

  /** Target language (canonical). */
  target_language?: string;

  /** Source language code. */
  source_lang?: string;

  /** Source language (auto-detected if omitted). */
  source_language?: string;
}

export interface DubResponse {
  audio_url: string;
  request_id: string;
  cost_ticks: number;
}

export interface AlignRequest {
  /** Base64-encoded audio. */
  audio?: string;

  /** Base64-encoded audio data (canonical). */
  audio_base64?: string;

  /** Text to align against the audio. */
  text: string;

  /** Language code. */
  language?: string;
}

export interface AlignedWord {
  word: string;
  start: number;
  end: number;
}

export interface AlignResponse {
  words?: AlignedWord[];
  /** Aligned segments. */
  segments?: AlignmentSegment[];
  request_id: string;
  cost_ticks: number;
}

export interface VoiceDesignRequest {
  /** Text description of the desired voice. */
  description: string;

  /** Sample text to speak with the designed voice. */
  text?: string;

  /** Text to preview the voice with. */
  preview_text?: string;

  /** Output audio format. */
  output_format?: string;
}

export interface VoicePreview {
  audio_url: string;
  voice_id: string;
}

export interface VoiceDesignResponse {
  previews: VoicePreview[];
  request_id: string;
  cost_ticks: number;
}

export interface StarfishTTSRequest {
  /** Text to speak. */
  text: string;

  /** Base64-encoded reference audio for voice cloning. */
  reference_audio?: string;

  /** Voice identifier. */
  voice?: string;

  /** Output audio format. */
  output_format?: string;

  /** Speech speed multiplier. */
  speed?: number;
}

export interface StarfishTTSResponse {
  audio_url: string;
  duration_seconds: number;
  request_id: string;
  cost_ticks: number;
}

// ── Advanced Music + Finetunes ────────────────────────────────────

export interface MusicAdvancedRequest {
  /** Prompt describing the music to generate. */
  prompt: string;
  /** Target duration in seconds. */
  duration_seconds?: number;
  /** Music generation model. */
  model?: string;
  /** Finetune ID to apply. */
  finetune_id?: string;
}

export interface MusicAdvancedClip {
  base64: string;
  format: string;
  size: number;
}

export interface MusicAdvancedResponse {
  clips: MusicAdvancedClip[];
  model: string;
  cost_ticks: number;
  request_id: string;
}

export interface MusicFinetuneInfo {
  finetune_id: string;
  name: string;
  description?: string;
  status: string;
  model_id?: string;
  created_at?: string;
}

export interface MusicFinetuneListResponse {
  finetunes: MusicFinetuneInfo[];
}

export interface MusicFinetuneCreateRequest {
  name: string;
  description?: string;
  /** Base64-encoded audio samples. */
  samples: string[];
}

// ── Video ──────────────────────────────────────────────────────────

export interface VideoRequest {
  /** Model for video generation. */
  model: string;

  /** Text prompt. */
  prompt: string;

  /** Duration in seconds. */
  duration?: number;

  /** Target video duration in seconds. */
  duration_seconds?: number;

  /** Video aspect ratio (e.g. "16:9", "9:16"). */
  aspect_ratio?: string;

  /** Resolution (e.g. "720p", "1080p"). */
  resolution?: string;
}

export interface GeneratedVideo {
  url?: string;
  duration_seconds?: number;
  /** Base64-encoded video data (or a URL). */
  base64?: string;
  /** Video format (e.g. "mp4"). */
  format?: string;
  /** Video file size. */
  size_bytes?: number;
  /** Video index within the batch. */
  index?: number;
}

export interface VideoResponse {
  videos: GeneratedVideo[];
  model: string;
  request_id: string;
  cost_ticks: number;
}

// ── HeyGen Video ──────────────────────────────────────────────────

export interface VideoStudioRequest {
  /** Avatar ID. */
  avatar_id: string;

  /** Script text. */
  script: string;

  /** Voice ID (optional). */
  voice_id?: string;

  /** Clips for multi-scene videos. */
  clips?: StudioClip[];
}

export interface StudioClip {
  avatar_id: string;
  script: string;
  voice_id?: string;
  background?: string;
}

export interface VideoTranslateRequest {
  /** URL of the video to translate. */
  video_url: string;

  /** Target language code. */
  target_lang: string;

  /** Source language code (auto-detect if omitted). */
  source_lang?: string;
}

export interface PhotoAvatarRequest {
  /** Base64-encoded photo image. */
  image?: string;

  /** Base64-encoded photo (canonical). */
  photo_base64?: string;

  /** Script text for the avatar to speak. */
  script?: string;

  /** Voice ID. */
  voice_id?: string;

  /** Aspect ratio. */
  aspect_ratio?: string;
}

export interface DigitalTwinRequest {
  /** Base64-encoded training video. */
  video?: string;

  /** Digital twin / avatar ID. */
  avatar_id?: string;

  /** Script text. */
  script?: string;

  /** Voice ID. */
  voice_id?: string;

  /** Aspect ratio. */
  aspect_ratio?: string;
}

export interface AsyncJobResponse {
  job_id: string;
  status: string;
}

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  preview_url?: string;
  [key: string]: unknown;
}

export interface AvatarsResponse {
  avatars: HeyGenAvatar[];
}

export interface HeyGenTemplate {
  template_id: string;
  name: string;
  [key: string]: unknown;
}

export interface HeyGenTemplatesResponse {
  templates: HeyGenTemplate[];
  request_id?: string;
}

export interface HeyGenVoice {
  voice_id: string;
  name: string;
  language?: string;
  /** Gender. */
  gender?: string;
  /** Additional fields. */
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface HeyGenVoicesResponse {
  voices: HeyGenVoice[];
}

// ── HeyGen Avatar Realtime (Broadcast) ────────────────────────────
//
// A realtime session makes an avatar speak live and publishes a plain HLS
// stream (720p). Sessions are PREPAID: the entire max_duration_seconds block
// is charged at create time and is NOT refunded on early cancel (cancelling
// only stops the upstream meter).

/**
 * Audio input union for "audio"-type realtime sessions, discriminated by
 * `type` ("url" | "asset_id" | "base64"). Also the shape of the template
 * variable `asset` field.
 */
export interface AvatarAudioInput {
  /** Input kind: "url" | "asset_id" | "base64". */
  type: string;

  /** Publicly accessible HTTPS URL (when type == "url"). */
  url?: string;

  /** HeyGen asset id from an asset upload (when type == "asset_id"). */
  asset_id?: string;

  /** MIME type, e.g. "audio/mpeg" (when type == "base64"). */
  media_type?: string;

  /** Base64-encoded audio bytes (when type == "base64"). */
  data?: string;
}

/** Request body for creating a live avatar session (prepaid). */
export interface AvatarRealtimeRequest {
  /** Session kind: "tts" | "audio" | "text_stream". */
  type: string;

  /** HeyGen photo-avatar / motion-avatar look id (required for all kinds). */
  avatar_id: string;

  /** Voice id — required for "tts" and "text_stream", must be omitted for "audio". */
  voice_id?: string;

  /** The fixed script ("tts") or the initial non-empty seed ("text_stream"). */
  text?: string;

  /** Audio input — required for "audio", must be omitted for "tts"/"text_stream". */
  audio?: AvatarAudioInput;

  /**
   * Prepaid block in seconds (1–3600). The whole block is charged at create
   * time; early cancel does NOT refund.
   */
  max_duration_seconds: number;
}

/** Response from creating a live avatar session. */
export interface AvatarRealtimeCreateResponse {
  /** Session id — use in the status/text/cancel calls. */
  stream_id: string;

  /** Always "pending" at create. */
  status: string;

  /** Echo of max_duration_seconds. */
  prepaid_seconds: number;

  /** Ticks charged for the prepaid block. */
  cost_ticks: number;

  /**
   * Post-deduction credit balance in ticks (from the X-QAI-Balance-After
   * header; Receipt Pattern).
   */
  balance_after?: number;

  /** Unique request identifier. */
  request_id: string;
}

/** Response from a session status check. */
export interface AvatarRealtimeStatusResponse {
  /** Session id. */
  stream_id: string;

  /** "pending" | "streaming" | "completed" | "error". */
  status: string;

  /** HLS .m3u8 playback URL (720p); present once streaming. */
  hls_url?: string;

  /** Failure detail when status == "error". */
  error_message?: string;

  /** On completed text_stream sessions: "final_marker" | "idle_timeout". */
  end_reason?: string;

  /** Unique request identifier. */
  request_id: string;
}

/** Request body for appending a text delta to a text_stream session. */
export interface AvatarRealtimeTextRequest {
  /**
   * Text fragment to append (a token or coalesced batch). Required unless
   * `final` is true, in which case it may be empty/omitted.
   */
  delta?: string;

  /**
   * True closes the text input (appending afterwards fails upstream with a
   * 410 provider_error). Default false.
   */
  final?: boolean;
}

/** Response from appending a text delta. */
export interface AvatarRealtimeTextResponse {
  /** Always true on success. */
  ok: boolean;

  /** Total text bytes buffered for the session so far. */
  buffered_bytes: number;

  /** Echo of the request's `final` flag. */
  final: boolean;

  /** Unique request identifier. */
  request_id: string;
}

/** Response from cancelling a session early. */
export interface AvatarRealtimeCancelResponse {
  /** Session id. */
  stream_id: string;

  /**
   * True = this call initiated cancellation; false = the session was already
   * terminal (cancel is idempotent).
   */
  cancelled: boolean;

  /** Unique request identifier. */
  request_id: string;
}

// ── HeyGen Sounds Search ──────────────────────────────────────────

/** Query parameters for searching the sounds catalog. */
export interface AudioSoundsQuery {
  /** Natural-language description of the sound wanted (required). */
  query: string;

  /** Catalog to search: "music" | "sound_effects" (API default: "music"). */
  type?: string;

  /** Max results, 1–50 (API default 10). */
  limit?: number;

  /** Minimum similarity score, 0–1 (API default 0.7). */
  min_score?: number;

  /** Opaque cursor from a previous response's next_token. */
  token?: string;
}

/** A track from the sounds catalog. */
export interface AudioSound {
  /** Track identifier. */
  id: string;

  /** Track name. */
  name: string;

  /** Track description. */
  description: string;

  /**
   * Pre-signed WAV URL with a limited lifetime — download promptly, do not
   * cache.
   */
  audio_url: string;

  /** Duration in seconds. */
  duration: number;

  /** Similarity score 0–1 (best first). */
  score: number;

  /** "music" | "sound_effects". */
  type: string;
}

/** Response from searching the sounds catalog (unbilled). */
export interface AudioSoundsResponse {
  /** Matching tracks, best score first (empty page → []). */
  sounds: AudioSound[];

  /** More pages exist. */
  has_more: boolean;

  /** Pass as `token` for the next page (may be empty). */
  next_token: string;

  /** Unique request identifier. */
  request_id: string;
}

// ── HeyGen Template v3 (variable schema + render) ─────────────────

/** A variable slot referenced by a template scene. */
export interface VideoTemplateSceneVariable {
  /** Variable name (key into the template's `variables` map). */
  name: string;

  /** Variable kind (e.g. "text", "image", "character", "voice"). */
  variable_type: string;
}

/** A scene in a template, in template order. */
export interface VideoTemplateScene {
  /** Scene identifier (usable in a generate request's scene_ids). */
  scene_id: string;

  /** Scene script with placeholders unreplaced (e.g. "Introducing {{headline}}..."). */
  script: string;

  /** Variables referenced by this scene. */
  variables: VideoTemplateSceneVariable[];
}

/**
 * Detailed template info: variable schema + scenes.
 *
 * Each `variables[name]` value is a discriminated union on its `"type"` field
 * ("text" | "image" | "video" | "audio" | "voice" | "character"; unknown
 * future types round-trip verbatim), returned in the exact shape a generate
 * request accepts — replace defaults and submit back.
 */
export interface VideoTemplateDetail {
  /** Template identifier. */
  id: string;

  /** Template name. */
  name: string;

  /** Aspect ratio (e.g. "16:9"). */
  aspect_ratio: string;

  /**
   * Variable schema keyed by variable name (union values kept as raw JSON so
   * unknown future variable types round-trip verbatim).
   */
  variables: Record<string, unknown>;

  /** Scenes in template order. */
  scenes: VideoTemplateScene[];
}

/** Response from inspecting a template's variable schema (unbilled). */
export interface VideoTemplateDetailResponse {
  /** The template detail. */
  template: VideoTemplateDetail;

  /** Unique request identifier. */
  request_id: string;
}

/**
 * Output dimension for a template render. Both values must be even, each
 * 128–4096, and keep the template aspect ratio.
 */
export interface VideoTemplateDimension {
  width: number;
  height: number;
}

/** Subtitle position for burned-in captions. */
export interface VideoSubtitlePosition {
  x: number;
  y: number;
}

/** Subtitle options for a template render (implies captions). */
export interface VideoTemplateSubtitles {
  /** Subtitle preset (e.g. "classic", "bold", "bright"). Required. */
  preset_name: string;

  /** Alignment (default 2). */
  alignment?: number;

  /** Disable word highlighting. */
  disable_highlight?: boolean;

  /** Font size. */
  font_size?: number;

  /** Subtitle position. */
  position?: VideoSubtitlePosition;
}

/** Request body for rendering a video from a template (async job). */
export interface VideoTemplateGenerateRequest {
  /**
   * Variable overrides keyed by name (at least one required). Values use the
   * same union shapes returned by the template detail route; omitted
   * variables keep the template defaults.
   */
  variables: Record<string, unknown>;

  /** Names the generated video. */
  title?: string;

  /** Restrict the render to these scenes, in order (repeats allowed). */
  scene_ids?: string[];

  /** Output dimension (must keep the template aspect ratio). */
  dimension?: VideoTemplateDimension;

  /** Frames per second: 25 (default), 30, or 60. */
  fps?: number;

  /** Burn captions (default false). */
  caption?: boolean;

  /** Subtitle options (implies captions). */
  subtitles?: VideoTemplateSubtitles;

  /** Background audio moves with scenes (default true). */
  reorder_music?: boolean;

  /** Keep text vertically centered (default false). */
  keep_text_vertically_centered?: boolean;

  /** Include a GIF preview in the webhook payload. */
  include_gif?: boolean;

  /** Enable a public share page. */
  enable_sharing?: boolean;

  /** HeyGen folder id. */
  folder_id?: string;

  /** Brand voice id. */
  brand_voice_id?: string;
}

// ── HeyGen Batch Videos ───────────────────────────────────────────

/** Request body for submitting a batch of videos. */
export interface VideoBatchSubmitRequest {
  /**
   * 1–100 raw HeyGen `POST /v3/videos` request bodies, passed through
   * verbatim. Each is polymorphic, discriminated by its `"type"` field
   * ("avatar" | "image" | "cinematic_avatar"), so items are kept as opaque
   * JSON objects.
   */
  videos: Record<string, unknown>[];

  /** Display name for the batch in the HeyGen app. */
  title?: string;
}

/** Response from submitting a video batch (202 Accepted). */
export interface VideoBatchSubmitResponse {
  /** Batch id — poll videoBatchStatus() with it. */
  batch_id: string;

  /** Always "processing" at submit. */
  status: string;

  /** Count of submitted items. */
  total_items: number;

  /** Unique request identifier. */
  request_id: string;
}

/** Query parameters for the batch status page. */
export interface VideoBatchStatusQuery {
  /** Page size (1–100; upstream default 100). */
  limit?: number;

  /** Opaque cursor from a previous response's next_token. */
  token?: string;
}

/** Per-item error detail in a batch status page. */
export interface VideoBatchItemError {
  code: string;
  message: string;
}

/** One item of a batch status page, ordered by item_index. */
export interface VideoBatchItem {
  /** Zero-based position in the submitted `videos` array. */
  item_index: number;

  /** "queued" | "processing" | "completed" | "failed". */
  status: string;

  /** Present once the item's video exists. */
  video_id?: string;

  /** Present only when billing_status == "settled" and the item completed. */
  video_url?: string;

  /** Present only when the item failed. */
  error?: VideoBatchItemError;
}

/**
 * Response from a batch status check (one cursor-paginated page of items).
 *
 * Billing settles the first time a GET observes a terminal batch status;
 * `video_url` values are withheld until `billing_status == "settled"` —
 * keep polling until then to obtain URLs.
 */
export interface VideoBatchStatusResponse {
  /** Batch id. */
  batch_id: string;

  /** Batch display name (may be empty). */
  title: string;

  /** Batch-level status: "processing" | "completed" | "failed". */
  status: string;

  /** Count of submitted items. */
  total_items: number;

  /** Per-item-status counts across the whole batch. */
  counts_by_status: Record<string, number>;

  /** Batch creation time in unix seconds (upstream HeyGen timestamp). */
  created_at: number;

  /** One page of items, ordered by item_index. */
  items: VideoBatchItem[];

  /** More item pages exist. */
  has_more: boolean;

  /** Pass as `token` for the next page (may be empty). */
  next_token: string;

  /** "unsettled" | "settlement_pending" | "settled". */
  billing_status: string;

  /** Total ticks charged for the batch; 0 until settled. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

// ── Embeddings ────────────────────────────────────────────────────

export interface EmbedRequest {
  /** Model for embedding generation. */
  model?: string;

  /** Input text(s) to embed. */
  input: string | string[];
}

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  request_id: string;
  cost_ticks: number;
}

// ── Documents ─────────────────────────────────────────────────────

export interface DocumentRequest {
  /** Document content (base64 or URL). */
  content?: string;

  /** Base64-encoded file content. */
  file_base64?: string;

  /** Original filename (helps determine the file type). */
  filename?: string;

  /** Content type (e.g. "pdf", "image", "url"). */
  type?: string;

  /** Desired output format (e.g. "markdown", "text"). */
  output_format?: string;

  /** Model for extraction. */
  model?: string;
}

export interface DocumentResponse {
  text?: string;
  /** Extracted text content. */
  content?: string;
  /** Format of the extracted content (e.g. "markdown"). */
  format?: string;
  /** Provider-specific metadata about the document. */
  meta?: Record<string, unknown>;
  pages?: number;
  request_id: string;
  cost_ticks: number;
}

export interface ChunkDocumentRequest {
  /** Text to chunk. */
  text: string;

  /** Target chunk size in tokens. */
  chunk_size?: number;
}

export interface DocumentChunk {
  text: string;
  index: number;
  tokens?: number;
  /** Estimated token count. */
  token_count?: number;
}

export interface ChunkDocumentResponse {
  chunks: DocumentChunk[];
  request_id: string;
  cost_ticks: number;
}

export interface ProcessDocumentRequest {
  /** Text to process. */
  text: string;

  /** Processing instructions. */
  instructions?: string;

  /** Model for processing. */
  model?: string;
}

export interface ProcessDocumentResponse {
  result: string;
  request_id: string;
  cost_ticks: number;
}

// ── RAG ───────────────────────────────────────────────────────────

export interface RAGSearchRequest {
  /** Search query. */
  query: string;

  /** Corpus name or ID (optional). */
  corpus?: string;

  /** Maximum number of results. */
  top_k?: number;
}

export interface RAGResult {
  text: string;
  score: number;
  source?: string;
}

export interface RAGSearchResponse {
  results: RAGResult[];
  request_id: string;
  cost_ticks: number;
}

export interface RAGCorpus {
  name: string;
  displayName: string;
  description: string;
  state: string;
}

export interface SurrealRAGSearchRequest {
  /** Search query. */
  query: string;

  /** Provider to search (optional). */
  provider?: string;

  /** Maximum number of results. */
  limit?: number;
}

export interface SurrealRAGResult {
  id: string;
  text: string;
  score: number;
  provider: string;
  source?: string;
}

export interface SurrealRAGSearchResponse {
  results: SurrealRAGResult[];
  request_id: string;
  cost_ticks: number;
}

export interface SurrealRAGProviderInfo {
  provider: string;
  chunk_count: number;
}

export interface SurrealRAGProvidersResponse {
  providers: SurrealRAGProviderInfo[];
}

// ── RAG Collections (user-scoped xAI proxy) ─────────────────────

export interface Collection {
  id: string;
  name: string;
  description?: string;
  document_count?: number;
  owner?: string;
  provider?: string;
  created_at?: string;
}

export interface CollectionDocument {
  file_id: string;
  name: string;
  size_bytes?: number;
  content_type?: string;
  processing_status?: string;
  document_status?: string;
  indexed?: boolean;
  created_at?: string;
}

export interface CollectionSearchResult {
  content: string;
  score?: number;
  file_id?: string;
  collection_id?: string;
  metadata?: Record<string, unknown>;
}

export interface CollectionSearchRequest {
  query: string;
  collection_ids: string[];
  mode?: string;
  max_results?: number;
}

export interface CollectionUploadResult {
  file_id: string;
  filename: string;
  bytes?: number;
}

// ── Models ────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  provider: string;
  display_name: string;
  input_per_million: number;
  output_per_million: number;
  [key: string]: unknown;
}

export interface PricingInfo {
  id: string;
  provider: string;
  display_name: string;
  input_per_million: number;
  output_per_million: number;
}

// ── Account ───────────────────────────────────────────────────────

export interface BalanceResponse {
  user_id: string;
  credit_ticks: number;
  credit_usd: number;
  ticks_per_usd: number;
}

export interface UsageEntry {
  id: string;
  request_id?: string;
  model?: string;
  provider?: string;
  endpoint?: string;
  delta_ticks?: number;
  balance_after?: number;
  input_tokens?: number;
  output_tokens?: number;
  created_at?: string;
}

export interface UsageResponse {
  entries: UsageEntry[];
  has_more: boolean;
  next_cursor?: string;
}

export interface UsageQuery {
  limit?: number;
  start_after?: string;
}

export interface UsageSummaryMonth {
  month: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_margin_usd: number;
  by_provider?: unknown[];
}

export interface UsageSummaryResponse {
  months: UsageSummaryMonth[];
}

export interface PricingEntry {
  Provider?: string;
  Model?: string;
  DisplayName?: string;
  InputPerMillion?: number;
  OutputPerMillion?: number;
  CachedPerMillion?: number;
  /** Upstream provider. */
  provider?: string;
  /** Model identifier. */
  model?: string;
  /** Human-readable model name. */
  display_name?: string;
  /** Cost per million input tokens in USD. */
  input_per_million?: number;
  /** Cost per million output tokens in USD. */
  output_per_million?: number;
  /** Cost per million cached tokens in USD. */
  cached_per_million?: number;
}

export interface AccountPricingResponse {
  pricing: Record<string, PricingEntry>;
}

// ── Jobs ──────────────────────────────────────────────────────────

export interface JobCreateRequest {
  type?: string;
  /** Job type (e.g. "video/generate", "audio/music"). */
  job_type?: string;
  params: Record<string, unknown>;
}

export interface JobCreateResponse {
  job_id: string;
  status: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: string;
  result?: unknown;
  error?: string;
  cost_ticks: number;
}

export interface JobListItem {
  job_id: string;
  status: string;
  type?: string;
  created_at?: string;
  completed_at?: string;
  cost_ticks: number;
}

export interface JobListResponse {
  jobs: JobListItem[];
}

/** SSE event from GET /qai/v1/jobs/{id}/stream */
export interface JobStreamEvent {
  type: "progress" | "complete" | "error";
  job_id?: string;
  status?: string;
  result?: unknown;
  error?: string;
  cost_ticks?: number;
  completed_at?: string;
}

// ── Search (Brave) ────────────────────────────────────────────────

export interface WebSearchRequest {
  query: string;
  count?: number;
  offset?: number;
  country?: string;
  language?: string;
  freshness?: "pd" | "pw" | "pm";
  safesearch?: string;
}

export interface WebSearchResult {
  title?: string;
  url?: string;
  description?: string;
  extra_snippets?: string[];
  age?: string;
  language?: string;
  thumbnail?: { src?: string; height?: number; width?: number };
}

export interface NewsResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  source?: string;
  thumbnail?: { src?: string; height?: number; width?: number };
}

export interface VideoSearchResult {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
  thumbnail?: { src?: string; height?: number; width?: number };
}

export interface WebSearchResponse {
  query?: { original?: string; altered?: string; language?: string };
  web?: { results: WebSearchResult[]; family_friendly?: boolean };
  news?: { results: NewsResult[] };
  videos?: { results: VideoSearchResult[] };
  infobox?: { title?: string; url?: string; description?: string; long_desc?: string };
  discussions?: { results: { title?: string; url?: string; description?: string; age?: string }[] };
}

export interface LLMContextRequest {
  query: string;
  count?: number;
  country?: string;
  language?: string;
  freshness?: "pd" | "pw" | "pm";
}

export interface ContentChunk {
  content?: string;
  url?: string;
  title?: string;
  score?: number;
  content_type?: string;
  index?: number;
}

export interface ContextSource {
  url?: string;
  title?: string;
  description?: string;
  snippet?: string;
}

export interface LLMContextResponse {
  chunks: ContentChunk[];
  sources?: ContextSource[];
  query?: string;
}

export interface SearchAnswerRequest {
  messages: { role: string; content: string }[];
  model?: string;
}

export interface SearchAnswerChoice {
  index?: number;
  message?: { role: string; content: string };
  finish_reason?: string;
}

export interface SearchCitation {
  url?: string;
  title?: string;
  snippet?: string;
}

export interface SearchAnswerResponse {
  choices: SearchAnswerChoice[];
  model?: string;
  id?: string;
  citations?: SearchCitation[];
}

// ── API Keys ──────────────────────────────────────────────────────

export interface CreateKeyRequest {
  name: string;
  scopes?: string[];
  expires_at?: string;
  /** Restrict to specific endpoints (e.g. ["chat", "images"]). */
  endpoints?: string[];
  /** Maximum spend in USD before the key is disabled. */
  spend_cap_usd?: number;
  /** Rate limit in requests per minute. */
  rate_limit?: number;
}

export interface CreateKeyResponse {
  key: string;
  id?: string;
  /** Key metadata. */
  details?: KeyDetails;
}

export interface KeyDetails {
  id: string;
  name: string;
  prefix?: string;
  /** First characters of the key for identification. */
  key_prefix?: string;
  scopes?: string[];
  /** Scope restrictions. */
  scope?: unknown;
  /** Amount spent by this key in ticks. */
  spent_ticks?: number;
  /** Whether the key has been revoked. */
  revoked?: boolean;
  created_at?: string;
  expires_at?: string;
  last_used_at?: string;
  /** Last usage timestamp. */
  last_used?: string;
}

export interface ListKeysResponse {
  keys: KeyDetails[];
}

// ── Compute ───────────────────────────────────────────────────────

export interface ComputeTemplate {
  id: string;
  name: string;
  gpu_type?: string;
  /** GPU type description. */
  gpu?: string;
  gpu_count?: number;
  /** VRAM per GPU in GB. */
  vram_gb?: number;
  vcpus?: number;
  ram_gb?: number;
  disk_gb?: number;
  price_per_hour?: number;
  /** Price per hour in USD. */
  price_per_hour_usd?: number;
  /** Available zones. */
  zones?: string[];
  [key: string]: unknown;
}

export interface TemplatesResponse {
  templates: ComputeTemplate[];
}

export interface ProvisionRequest {
  template_id?: string;
  /** Template ID to provision. */
  template?: string;
  region?: string;
  /** Preferred zone (e.g. "us-central1-a"). */
  zone?: string;
  /** Use spot/preemptible pricing. */
  spot?: boolean;
  /** Auto-teardown after N minutes of inactivity. */
  auto_teardown_minutes?: number;
  ssh_public_key?: string;
}

export interface ProvisionResponse {
  instance_id: string;
  status: string;
  /** Template that was provisioned. */
  template?: string;
  /** Zone the instance was placed in. */
  zone?: string;
  /** SSH connection address. */
  ssh_address?: string;
  /** Estimated price per hour. */
  price_per_hour_usd?: number;
}

export interface ComputeInstanceInfo {
  id: string;
  status: string;
  template_id: string;
  created_at: string;
  [key: string]: unknown;
}

export interface InstancesResponse {
  instances: ComputeInstanceInfo[];
}

export interface InstanceDetailInfo extends ComputeInstanceInfo {
  ip_address?: string;
  ssh_host?: string;
  ssh_port?: number;
}

export interface InstanceResponse {
  instance: InstanceDetailInfo;
}

export interface SSHKeyRequest {
  ssh_public_key: string;
}

export interface DeleteResponse {
  status: string;
  cost_ticks?: number;
  /** Instance that was deleted. */
  instance_id?: string;
}

// ── Voice Management ──────────────────────────────────────────────

export interface VoiceInfo {
  voice_id: string;
  name: string;
  provider: string;
  preview_url?: string;
  [key: string]: unknown;
}

export interface VoicesResponse {
  voices: VoiceInfo[];
}

export interface CloneVoiceRequest {
  name: string;
  /** Base64-encoded audio samples. */
  audio_samples: string[];
  description?: string;
}

export interface CloneVoiceResponse {
  voice_id: string;
  name: string;
  /** Status message. */
  status?: string;
}

// ── Voice Library ─────────────────────────────────────────────────

export interface SharedVoice {
  public_owner_id: string;
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  use_case?: string;
  rate?: number;
  cloned_by_count?: number;
  free_users_allowed?: boolean;
}

export interface SharedVoicesResponse {
  voices: SharedVoice[];
  next_cursor?: string;
  has_more: boolean;
}

export interface VoiceLibraryQuery {
  query?: string;
  page_size?: number;
  cursor?: string;
  gender?: string;
  language?: string;
  use_case?: string;
}

export interface AddVoiceFromLibraryRequest {
  public_owner_id: string;
  voice_id: string;
  name?: string;
}

export interface AddVoiceFromLibraryResponse {
  voice_id: string;
}

// ── 3D Generation ─────────────────────────────────────────────────

export interface Generate3DRequest {
  model: string;
  prompt?: string;
  image_url?: string;
}

// ── Contact ───────────────────────────────────────────────────────

export interface ContactRequest {
  /** Sender name. */
  name: string;

  /** Sender email address. */
  email: string;

  /** Message subject. */
  subject?: string;

  /** Message body. */
  message: string;
}

// ── Batch Processing ──────────────────────────────────────────────

/** A single job in a batch submission. */
export interface BatchJobInput {
  /** Model to use for this job. */
  model: string;

  /** The prompt text. */
  prompt: string;

  /** Optional title for this job. */
  title?: string;

  /** Optional system prompt. */
  system_prompt?: string;

  /** Optional maximum tokens to generate. */
  max_tokens?: number;
}

/** Request to submit a batch of jobs. */
export interface BatchSubmitRequest {
  /** Array of jobs to submit. */
  jobs: BatchJobInput[];
}

/** Response from batch submission. */
export interface BatchSubmitResponse {
  /** The IDs of the created jobs. */
  job_ids: string[];

  /** Status of the batch submission. */
  status: string;
}

/** Response from JSONL batch submission. */
export interface BatchJsonlResponse {
  /** The IDs of the created jobs. */
  job_ids: string[];
}

/** A single job in the batch jobs list. */
export interface BatchJobInfo {
  job_id: string;
  status: string;
  model?: string;
  title?: string;
  created_at?: string;
  completed_at?: string;
  result?: unknown;
  error?: string;
  cost_ticks: number;
}

/** Response from listing batch jobs. */
export interface BatchJobsResponse {
  jobs: BatchJobInfo[];
}

// ── Credits ───────────────────────────────────────────────────────

/** A credit pack available for purchase. */
export interface CreditPack {
  id: string;
  name?: string;
  price_usd: number;
  credit_ticks: number;
  description?: string;
}

/** Response from listing credit packs. */
export interface CreditPacksResponse {
  packs: CreditPack[];
}

/** Request to purchase a credit pack. */
export interface CreditPurchaseRequest {
  pack_id: string;
  success_url?: string;
  cancel_url?: string;
}

/** Response from purchasing a credit pack. */
export interface CreditPurchaseResponse {
  checkout_url: string;
}

/** Response from checking credit balance. */
export interface CreditBalanceResponse {
  balance_ticks: number;
  balance_usd: number;
}

/** A pricing tier. */
export interface CreditTier {
  name?: string;
  min_balance?: number;
  discount_percent?: number;
  /** Additional tier data. */
  extra?: unknown;
  [key: string]: unknown;
}

/** Response from listing credit tiers. */
export interface CreditTiersResponse {
  tiers: CreditTier[];
}

/** Request to apply for the developer program. */
export interface DevProgramApplyRequest {
  use_case: string;
  company?: string;
  expected_usd?: number;
  website?: string;
}

/** Response from dev program application. */
export interface DevProgramApplyResponse {
  status: string;
}

// ── Auth ──────────────────────────────────────────────────────────

/** User information returned after authentication. */
export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

/** Response from authentication endpoints. */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** Request body for Apple Sign-In. */
export interface AuthAppleRequest {
  /** The Apple identity token (JWT from Sign in with Apple). */
  id_token: string;

  /** Optional display name (only provided on first sign-in). */
  name?: string;
}

// ── Status ────────────────────────────────────────────────────────

/** Generic status response used by many endpoints. */
export interface StatusResponse {
  /** Status string (e.g. "revoked", "deleted", "alive", "sent"). */
  status: string;

  /** Optional human-readable message. */
  message?: string;

  /** Additional fields. */
  [key: string]: unknown;
}

// ── Internal response wrappers ─────────────────────────────────────

/** @internal */
export interface ModelsResponseBody {
  models: ModelInfo[];
}

/** @internal */
export interface PricingResponseBody {
  pricing: PricingInfo[];
}

/** @internal */
export interface RAGCorporaResponseBody {
  corpora: RAGCorpus[];
  request_id: string;
}

/** @internal */
export interface APIErrorBody {
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

// ── 3D Mesh Operations ───────────────────────────────────────────

export interface RemeshRequest {
  input_task_id?: string;
  model_url?: string;
  target_formats?: string[];
  topology?: string;
  target_polycount?: number;
  resize_height?: number;
  origin_at?: string;
  convert_format_only?: boolean;
}

export interface ModelUrls {
  glb?: string;
  fbx?: string;
  obj?: string;
  usdz?: string;
  stl?: string;
  blend?: string;
}

export interface RigRequest {
  input_task_id?: string;
  model_url?: string;
  height_meters?: number;
  texture_image_url?: string;
}

export interface BasicAnimations {
  walking_glb_url?: string;
  walking_fbx_url?: string;
  walking_armature_glb_url?: string;
  running_glb_url?: string;
  running_fbx_url?: string;
  running_armature_glb_url?: string;
}

export interface AnimateRequest {
  rig_task_id: string;
  action_id: number;
  /** Optional post-processing. */
  post_process?: AnimationPostProcess;
}

export interface RetextureRequest {
  input_task_id?: string;
  model_url?: string;
  /** Text prompt describing the desired texture. */
  prompt?: string;
  text_style_prompt?: string;
  image_style_url?: string;
  ai_model?: string;
  enable_original_uv?: boolean;
  enable_pbr?: boolean;
  remove_lighting?: boolean;
  target_formats?: string[];
}

// ── Animation Post-Processing ────────────────────────────────────

/** Post-processing options for animation export. */
export interface AnimationPostProcess {
  /** Operation: "change_fps", "fbx2usdz", "extract_armature". */
  operation_type: string;
  /** Target FPS (for "change_fps"): 24, 25, 30, 60. */
  fps?: number;
}

// ── Agent Stream ─────────────────────────────────────────────────

/** A single event from an agent or mission SSE stream. */
export interface AgentStreamEvent {
  /** Event type (e.g. "step", "thought", "tool_call", "tool_result", "message", "error", "done"). */
  event_type: string;
  /** Raw JSON payload. */
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Describes a worker agent in a multi-agent run. */
export interface AgentWorker {
  /** Worker name. */
  name: string;
  /** Model ID for this worker. */
  model?: string;
  /** Worker tier (e.g. "fast", "thinking"). */
  tier?: string;
  /** Description of this worker's role. */
  description?: string;
}

/** Describes a named worker for a mission. */
export interface MissionWorker {
  /** Model ID for this worker. */
  model?: string;
  /** Worker tier. */
  tier?: string;
  /** Description of this worker's purpose. */
  description?: string;
}

// ── Audio Types ──────────────────────────────────────────────────

/** A single alignment segment. */
export interface AlignmentSegment {
  /** Aligned text. */
  text: string;
  /** Start time in seconds. */
  start: number;
  /** End time in seconds. */
  end: number;
}

/** Generic audio response used by multiple advanced audio endpoints. */
export interface AudioResponse {
  /** Base64-encoded audio data. */
  audio_base64?: string;
  /** Audio format (e.g. "mp3", "wav"). */
  format?: string;
  /** File size in bytes. */
  size_bytes?: number;
  /** Model used. */
  model?: string;
  /** Total cost in ticks. */
  cost_ticks?: number;
  /** Unique request identifier. */
  request_id?: string;
  /** Additional response fields. */
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

/** A single dialogue turn. */
export interface DialogueTurn {
  /** Speaker name or identifier. */
  speaker: string;
  /** Text for this speaker to say. */
  text: string;
  /** Voice ID to use for this speaker. */
  voice?: string;
}

/** Request body for voice isolation. */
export interface IsolateRequest {
  /** Base64-encoded audio to isolate voice from. */
  audio_base64: string;
  /** Output audio format. */
  output_format?: string;
}

/** Request body for voice remixing. */
export interface RemixRequest {
  /** Base64-encoded source audio. */
  audio_base64: string;
  /** Target voice for the remix. */
  voice?: string;
  /** Model for remixing. */
  model?: string;
  /** Output audio format. */
  output_format?: string;
}

/** Request body for text-to-speech (canonical). */
export interface TtsRequest {
  /** TTS model. */
  model: string;
  /** Text to synthesise into speech. */
  text: string;
  /** Voice to use. */
  voice?: string;
  /** Audio format (e.g. "mp3", "wav", "opus"). */
  output_format?: string;
  /** Speech rate. */
  speed?: number;
}

/** Response from text-to-speech (canonical). */
export interface TtsResponse {
  /** Base64-encoded audio data. */
  audio_base64: string;
  /** Audio format (e.g. "mp3"). */
  format: string;
  /** Audio file size. */
  size_bytes: number;
  /** Model that generated the audio. */
  model: string;
  /** Total cost in ticks. */
  cost_ticks: number;
  /** Unique request identifier. */
  request_id: string;
}

/** Request body for speech-to-text (canonical). */
export interface SttRequest {
  /** STT model. */
  model: string;
  /** Base64-encoded audio data. */
  audio_base64: string;
  /** Original filename. */
  filename?: string;
  /** BCP-47 language code hint. */
  language?: string;
}

/** Response from speech-to-text (canonical). */
export interface SttResponse {
  /** Transcribed text. */
  text: string;
  /** Model that performed transcription. */
  model: string;
  /** Total cost in ticks. */
  cost_ticks: number;
  /** Unique request identifier. */
  request_id: string;
}

/** Request body for audio translation. */
export interface TranslateRequest {
  /** URL of the video to translate. */
  video_url?: string;
  /** Base64-encoded video. */
  video_base64?: string;
  /** Target language code. */
  target_language: string;
  /** Source language code (auto-detected if omitted). */
  source_language?: string;
}

// ── Eleven Music (advanced) ──────────────────────────────────────

/** A section within an Eleven Music generation request. */
export interface MusicSection {
  section_type: string;
  lyrics?: string;
  style?: string;
  style_exclude?: string;
}

/** Request body for advanced music generation (ElevenLabs Eleven Music). */
export interface ElevenMusicRequest {
  model: string;
  prompt: string;
  sections?: MusicSection[];
  duration_seconds?: number;
  language?: string;
  vocals?: boolean;
  style?: string;
  style_exclude?: string;
  finetune_id?: string;
  edit_reference_id?: string;
  edit_instruction?: string;
}

/** A single music clip from advanced generation. */
export interface ElevenMusicClip {
  /** Base64-encoded audio data. */
  base64: string;
  /** Audio format (e.g. "mp3"). */
  format: string;
  /** File size in bytes. */
  size: number;
}

/** Response from advanced music generation. */
export interface ElevenMusicResponse {
  /** Generated music clips. */
  clips: ElevenMusicClip[];
  /** Model used. */
  model: string;
  /** Total cost in ticks. */
  cost_ticks: number;
  /** Unique request identifier. */
  request_id: string;
}

/** Info about a music finetune. */
export interface FinetuneInfo {
  finetune_id: string;
  name: string;
  status?: string;
  created_at?: string;
}

/** Response from listing finetunes. */
export interface ListFinetunesResponse {
  finetunes: FinetuneInfo[];
}

// ── Batch Types ──────────────────────────────────────────────────

/** A single job in a batch submission (Rust canonical). */
export interface BatchJob {
  /** Model to use for this job. */
  model: string;
  /** The prompt text. */
  prompt: string;
  /** Optional title for this job. */
  title?: string;
  /** Optional system prompt. */
  system_prompt?: string;
  /** Optional maximum tokens to generate. */
  max_tokens?: number;
}

// ── Compute Types ────────────────────────────────────────────────

/** A running compute instance. */
export interface ComputeInstance {
  /** Instance identifier. */
  id: string;
  /** Current status. */
  status: string;
  /** Template used. */
  template?: string;
  /** Zone. */
  zone?: string;
  /** SSH connection address. */
  ssh_address?: string;
  /** Creation timestamp. */
  created_at?: string;
  /** Price per hour. */
  price_per_hour_usd?: number;
  /** Auto-teardown setting in minutes. */
  auto_teardown_minutes?: number;
}

// ── Document Types ───────────────────────────────────────────────

/** Request body for document chunking (canonical). */
export interface ChunkRequest {
  /** Base64-encoded file content. */
  file_base64: string;
  /** Original filename. */
  filename: string;
  /** Maximum chunk size in tokens. */
  max_chunk_tokens?: number;
  /** Overlap between chunks in tokens. */
  overlap_tokens?: number;
}

/** Response from document chunking (canonical). */
export interface ChunkResponse {
  /** Document chunks. */
  chunks: DocumentChunk[];
  /** Total number of chunks. */
  total_chunks?: number;
  /** Total cost in ticks. */
  cost_ticks: number;
  /** Unique request identifier. */
  request_id: string;
}

/** Request body for document processing (canonical). */
export interface ProcessRequest {
  /** Base64-encoded file content. */
  file_base64: string;
  /** Original filename. */
  filename: string;
  /** Processing instructions or prompt. */
  prompt?: string;
  /** Model to use for processing. */
  model?: string;
}

/** Response from document processing (canonical). */
export interface ProcessResponse {
  /** Processed content / analysis result. */
  content: string;
  /** Model used for processing. */
  model?: string;
  /** Total cost in ticks. */
  cost_ticks: number;
  /** Unique request identifier. */
  request_id: string;
}

// ── Error Types ──────────────────────────────────────────────────

/** Error types returned by the Quantum AI SDK. */
export interface ApiError {
  /** The HTTP status code from the response. */
  status_code: number;
  /** The error type from the API. */
  code: string;
  /** The human-readable error description. */
  message: string;
  /** The unique request identifier. */
  request_id: string;
}

// ── Jobs Types ───────────────────────────────────────────────────

/** Summary of a job in the list response. */
export interface JobSummary {
  job_id: string;
  status: string;
  job_type?: string;
  created_at?: string;
  completed_at?: string;
  cost_ticks: number;
}

/** Response from listing jobs. */
export interface ListJobsResponse {
  jobs: JobSummary[];
}

/** Response from async video job submission. */
export interface JobResponse {
  /** Job identifier for polling status. */
  job_id: string;
  /** Current status. */
  status?: string;
  /** Total cost in ticks. */
  cost_ticks?: number;
  /** Additional response fields. */
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

// ── RAG Types ────────────────────────────────────────────────────

/** Request body for Vertex AI RAG search (canonical). */
export interface RagSearchRequest {
  /** Search query. */
  query: string;
  /** Filter by corpus name or ID. */
  corpus?: string;
  /** Maximum number of results. */
  top_k?: number;
}

/** Response from RAG search (canonical). */
export interface RagSearchResponse {
  /** Matching document chunks. */
  results: RagResult[];
  /** Original search query. */
  query: string;
  /** Corpora that were searched. */
  corpora?: string[];
  /** Total cost in ticks. */
  cost_ticks: number;
  /** Unique request identifier. */
  request_id: string;
}

/** A single result from RAG search (canonical). */
export interface RagResult {
  /** Source document URI. */
  source_uri: string;
  /** Display name of the source. */
  source_name: string;
  /** Matching text chunk. */
  text: string;
  /** Relevance score. */
  score: number;
  /** Vector distance. */
  distance: number;
}

/** Describes an available RAG corpus (canonical). */
export interface RagCorpus {
  /** Full resource name. */
  name: string;
  /** Human-readable name. */
  displayName: string;
  /** Describes the corpus contents. */
  description: string;
  /** Corpus state (e.g. "ACTIVE"). */
  state: string;
}

/** A SurrealDB RAG provider (canonical). */
export interface SurrealRagProvider {
  /** Provider identifier. */
  provider: string;
  /** Number of document chunks for this provider. */
  chunk_count?: number;
}

/** Response from listing SurrealDB RAG providers (canonical). */
export interface SurrealRagProvidersResponse {
  providers: SurrealRagProvider[];
}

/** Request body for SurrealDB-backed RAG search (canonical). */
export interface SurrealRagSearchRequest {
  /** Search query. */
  query: string;
  /** Filter by documentation provider. */
  provider?: string;
  /** Maximum number of results. */
  limit?: number;
}

/** A single result from SurrealDB RAG search (canonical). */
export interface SurrealRagResult {
  /** Documentation provider. */
  provider: string;
  /** Document title. */
  title: string;
  /** Section heading. */
  heading: string;
  /** Original source file path. */
  source_file: string;
  /** Matching text chunk. */
  content: string;
  /** Cosine similarity score. */
  score: number;
}

/** Response from SurrealDB RAG search (canonical). */
export interface SurrealRagSearchResponse {
  /** Matching documentation chunks. */
  results: SurrealRagResult[];
  /** Original search query. */
  query: string;
  /** Provider filter that was applied. */
  provider?: string;
  /** Total cost in ticks. */
  cost_ticks: number;
  /** Unique request identifier. */
  request_id: string;
}

// ── Realtime Types ───────────────────────────────────────────────

/** Configuration for a realtime voice session (canonical). */
export interface RealtimeConfig {
  /** Voice to use. */
  voice: string;
  /** System instructions for the AI. */
  instructions: string;
  /** PCM sample rate in Hz. */
  sample_rate?: number;
  /** Tool definitions. */
  tools?: unknown[];
  /** Model to use for the realtime session. */
  model?: string;
}

/** Parsed incoming event from the realtime API. */
export interface RealtimeEvent {
  /** Event type. */
  type: string;
  /** Event-specific data. */
  [key: string]: unknown;
}

// ── Search Types ─────────────────────────────────────────────────

/** A single web search result (canonical). */
export interface WebResult {
  /** Page title. */
  title: string;
  /** Page URL. */
  url: string;
  /** Result description / snippet. */
  description?: string;
  /** Age of the result. */
  age?: string;
  /** Favicon URL. */
  favicon?: string;
}

/** A video search result (canonical). */
export interface VideoResult {
  /** Video title. */
  title: string;
  /** Video page URL. */
  url: string;
  /** Short description. */
  description?: string;
  /** Thumbnail URL. */
  thumbnail?: string;
  /** Age of the video. */
  age?: string;
}

/** An infobox (knowledge panel) result. */
export interface InfoboxResult {
  /** Infobox title. */
  title: string;
  /** Long description. */
  description?: string;
  /** Source URL. */
  url?: string;
}

/** A discussion / forum result. */
export interface DiscussionResult {
  /** Discussion title. */
  title: string;
  /** Discussion URL. */
  url: string;
  /** Short description. */
  description?: string;
  /** Age of the discussion. */
  age?: string;
  /** Forum name. */
  forum?: string;
}

/** Request body for search context (returns chunked page content). */
export interface SearchContextRequest {
  /** Search query string. */
  query: string;
  /** Number of results to fetch context from. */
  count?: number;
  /** Country code filter. */
  country?: string;
  /** Language code filter. */
  language?: string;
  /** Freshness filter. */
  freshness?: string;
}

/** A content chunk from search context (canonical). */
export interface SearchContextChunk {
  /** Extracted page content. */
  content: string;
  /** Source URL. */
  url: string;
  /** Page title. */
  title?: string;
  /** Relevance score. */
  score?: number;
  /** Content type. */
  content_type?: string;
}

/** A source reference from search context (canonical). */
export interface SearchContextSource {
  /** Source URL. */
  url: string;
  /** Source title. */
  title?: string;
}

/** Response from the search context endpoint. */
export interface SearchContextResponse {
  /** Content chunks extracted from search results. */
  chunks: SearchContextChunk[];
  /** Source references. */
  sources?: SearchContextSource[];
  /** Original query. */
  query: string;
}

/** A chat message for the search answer endpoint (canonical). */
export interface SearchAnswerMessage {
  /** Message role. */
  role: string;
  /** Message text content. */
  content: string;
}

/** A citation reference in a search answer (canonical). */
export interface SearchAnswerCitation {
  /** Source URL. */
  url: string;
  /** Source title. */
  title?: string;
  /** Snippet from the source. */
  snippet?: string;
}

// ── Session Types ────────────────────────────────────────────────

/** Context metadata returned with session responses (canonical). */
export interface SessionContext {
  /** Number of conversation turns in the session. */
  turn_count: number;
  /** Estimated total tokens in the session context. */
  estimated_tokens: number;
  /** Whether context was compacted during this turn. */
  compacted?: boolean;
  /** Note about the compaction. */
  compaction_note?: string;
}

/** A tool result to feed back into the session (canonical). */
export interface ToolResult {
  /** The tool_use ID this result corresponds to. */
  tool_call_id: string;
  /** The result content. */
  content: string;
  /** Whether this result is an error. */
  is_error?: boolean;
}

// ── Video Types ──────────────────────────────────────────────────

/** A HeyGen avatar (canonical). */
export interface Avatar {
  /** Avatar identifier. */
  avatar_id: string;
  /** Avatar name. */
  name?: string;
  /** Avatar gender. */
  gender?: string;
  /** Preview image URL. */
  preview_url?: string;
  /** Additional fields. */
  extra?: Record<string, unknown>;
}

/** Request body for HeyGen studio video creation. */
export interface StudioVideoRequest {
  /** Video title. */
  title?: string;
  /** Video clips. */
  clips: StudioClip[];
  /** Video dimensions. */
  dimension?: string;
  /** Aspect ratio. */
  aspect_ratio?: string;
}

/** A HeyGen video template (canonical). */
export interface VideoTemplate {
  /** Template identifier. */
  template_id: string;
  /** Template name. */
  name?: string;
  /** Preview image URL. */
  preview_url?: string;
  /** Additional fields. */
  extra?: Record<string, unknown>;
}

/** Response from listing HeyGen video templates. */
export interface VideoTemplatesResponse {
  templates: VideoTemplate[];
}

// ── Voice Types ──────────────────────────────────────────────────

/** A voice available for TTS (canonical). */
export interface Voice {
  /** Voice identifier. */
  voice_id: string;
  /** Human-readable voice name. */
  name: string;
  /** Provider (e.g. "elevenlabs", "openai"). */
  provider?: string;
  /** Language/locale codes supported. */
  languages?: string[];
  /** Voice gender. */
  gender?: string;
  /** Whether this is a cloned voice. */
  is_cloned?: boolean;
  /** Preview audio URL. */
  preview_url?: string;
}

/** A file to include in a voice clone request. */
export interface CloneVoiceFile {
  /** Original filename (e.g. "sample.mp3"). */
  filename: string;
  /** Raw file bytes. */
  data: Uint8Array | number[];
  /** MIME type (e.g. "audio/mpeg"). */
  mime_type: string;
}

// ── Pricing Types ────────────────────────────────────────────────

/** Pricing response (map of model_id to entry). */
export interface PricingResponse {
  pricing: Record<string, PricingEntry>;
}

// ── Error Enum (for reference) ───────────────────────────────────

/** Error type enum values matching Rust SDK. */
export type Error = ApiError | { type: "http"; message: string } | { type: "json"; message: string } | { type: "websocket"; message: string };

// ── Cross-SDK Parity Types ──────────────────────────────────────

/** A citation returned with search-grounded chat responses. */
export interface Citation {
  url: string;
  title: string;
  text?: string;
  index?: number;
}

/** Response from listing RAG collections. */
export interface CollectionsListResponse {
  collections: Collection[];
}

/** Response from listing documents in a collection. */
export interface CollectionDocumentsResponse {
  documents: CollectionDocument[];
}

/** Response from searching a collection. */
export interface CollectionSearchResponse {
  results: CollectionSearchResult[];
}

/** Request to create a new RAG collection. */
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  provider?: string;
}

/** Response from deleting a collection. */
export interface DeleteCollectionResponse {
  deleted: boolean;
}

/** Response from listing available models. */
export interface ModelsResponse {
  models: ModelInfo[];
}

/** Response from listing Vertex AI RAG corpora. */
export interface RagCorporaResponse {
  corpora: RagCorpus[];
}

/** Canonical alias for InfoboxResult. */
export type Infobox = InfoboxResult;

/** Canonical alias for DiscussionResult. */
export type Discussion = DiscussionResult;

/** Canonical aliases for TTS/STT types. */
export type TextToSpeechRequest = TTSRequest;
export type TextToSpeechResponse = TTSResponse;
export type SpeechToTextRequest = STTRequest;
export type SpeechToTextResponse = STTResponse;

/** Response from the contact form endpoint. */
export interface ContactResponse {
  status: string;
  message?: string;
}

/** Canonical alias for SearchContextChunk. */
export type ContextChunk = SearchContextChunk;

/** Options for configuring LLM context search requests. */
export interface ContextOptions {
  count?: number;
  country?: string;
  language?: string;
  freshness?: string;
}

/** Response from listing HeyGen avatars. */
export interface HeyGenAvatarsResponse {
  avatars: Avatar[];
  request_id?: string;
}

/** Response from async job submission. */
export interface JobAcceptedResponse {
  job_id: string;
  status: string;
  /** Job type as sent on the wire (e.g. "video/template-v3"). */
  type?: string;
  job_type?: string;
  request_id?: string;
}

/** A single job entry in the detailed job list response. */
export interface JobListEntry {
  job_id: string;
  status: string;
  job_type?: string;
  result?: unknown;
  error?: string;
  cost_ticks: number;
  created_at?: string;
  completed_at?: string;
  request_id?: string;
}

/** Post-processing options for animation export. */
export interface PostProcess {
  operation_type: string;
  fps?: number;
}

/** Response from creating a realtime voice session. */
export interface RealtimeSessionResponse {
  ephemeral_token?: string;
  url?: string;
  signed_url?: string;
  session_id?: string;
  provider?: string;
}

/** Canonical alias for SearchAnswerMessage. */
export type SearchMessage = SearchAnswerMessage;

/** Options for configuring web search requests. */
export interface SearchOptions {
  count?: number;
  offset?: number;
  country?: string;
  language?: string;
  freshness?: string;
  safe_search?: string;
}

// ── Scraper Types ────────────────────────────────────────────────

/** A single scrape target. */
export interface ScrapeTarget {
  name: string;
  url: string;
  type?: string;
  selector?: string;
  content?: string;
  notebook?: string;
  recursive?: boolean;
  max_pages?: number;
  delay_ms?: number;
  ingest?: string;
}

/** Request body for submitting a scrape job. */
export interface ScrapeRequest {
  targets: ScrapeTarget[];
}

/** Response from submitting a scrape job. */
export interface ScrapeResponse {
  job_id: string;
  status: string;
  targets: number;
  request_id: string;
}

/** A single URL to screenshot. */
export interface ScreenshotURL {
  url: string;
  width?: number;
  height?: number;
  full_page?: boolean;
  delay_ms?: number;
}

/** Request body for taking screenshots. */
export interface ScreenshotRequest {
  urls: ScreenshotURL[];
}

/** A single screenshot result. */
export interface ScreenshotResult {
  url: string;
  base64: string;
  format: string;
  width: number;
  height: number;
  error?: string;
}

/** Response from the screenshot endpoint. */
export interface ScreenshotResponse {
  screenshots: ScreenshotResult[];
  count: number;
}
