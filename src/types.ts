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
}

// ── Response Metadata ──────────────────────────────────────────────

/** Common metadata parsed from API response headers. */
export interface ResponseMeta {
  costTicks: number;
  requestId: string;
  model: string;
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
   * Provider-specific settings (e.g. Anthropic thinking, xAI search).
   * Example: { anthropic: { thinking: { budget_tokens: 10000 } } }
   */
  provider_options?: Record<string, Record<string, unknown>>;
}

export interface ChatMessage {
  /** One of "system", "user", "assistant", or "tool". */
  role: "system" | "user" | "assistant" | "tool";

  /** Text content of the message. */
  content?: string;

  /**
   * Structured content for assistant messages with tool calls.
   * When present, takes precedence over content.
   */
  content_blocks?: ContentBlock[];

  /** Required when role is "tool" -- references the tool_use ID. */
  tool_call_id?: string;

  /** Indicates whether a tool result is an error. */
  is_error?: boolean;
}

export interface ContentBlock {
  /** One of "text", "thinking", or "tool_use". */
  type: "text" | "thinking" | "tool_use";

  /** Content for "text" and "thinking" blocks. */
  text?: string;

  /** Tool call identifier for "tool_use" blocks. */
  id?: string;

  /** Function name for "tool_use" blocks. */
  name?: string;

  /** Function arguments for "tool_use" blocks. */
  input?: Record<string, unknown>;
}

export interface ChatTool {
  /** Function name. */
  name: string;

  /** Explains what the function does. */
  description: string;

  /** JSON Schema for the function's arguments. */
  parameters?: Record<string, unknown>;
}

export interface ChatUsage {
  input_tokens: number;
  output_tokens: number;
  cost_ticks: number;
}

export interface ChatResponse {
  /** Unique request identifier. */
  id: string;

  /** Model that generated the response. */
  model: string;

  /** List of content blocks (text, thinking, tool_use). */
  content: ContentBlock[];

  /** Token counts and cost. */
  usage?: ChatUsage;

  /** Why generation stopped: "end_turn", "tool_use", "max_tokens". */
  stop_reason: string;

  /** Total cost from X-QAI-Cost-Ticks header. */
  cost_ticks: number;

  /** From X-QAI-Request-Id header. */
  request_id: string;
}

// ── Stream ─────────────────────────────────────────────────────────

export interface StreamEvent {
  /** Event type: "content_delta", "thinking_delta", "tool_use", "usage", "heartbeat", "error", "done". */
  type: string;

  /** Incremental text for content_delta and thinking_delta events. */
  delta?: StreamDelta;

  /** Populated for tool_use events. */
  tool_use?: StreamToolUse;

  /** Populated for usage events. */
  usage?: ChatUsage;

  /** Populated for error events. */
  error?: string;

  /** True when the stream is complete. */
  done: boolean;
}

export interface StreamDelta {
  text: string;
}

export interface StreamToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Raw SSE JSON shape before parsing into typed StreamEvent. */
export interface RawStreamEvent {
  type: string;
  delta?: StreamDelta;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  input_tokens?: number;
  output_tokens?: number;
  cost_ticks?: number;
  message?: string;
}

// ── Image ──────────────────────────────────────────────────────────

export interface ImageRequest {
  /** Image generation model (e.g. "grok-imagine-image", "gpt-image-1", "dall-e-3"). */
  model: string;

  /** Describes the image to generate. */
  prompt: string;

  /** Number of images to generate (default 1). */
  count?: number;

  /** Output dimensions (e.g. "1024x1024", "1536x1024"). */
  size?: string;

  /** Aspect ratio (e.g. "16:9", "1:1"). */
  aspect_ratio?: string;

  /** Quality level (e.g. "standard", "hd"). */
  quality?: string;

  /** Image format (e.g. "png", "jpeg", "webp"). */
  output_format?: string;

  /** Style preset (e.g. "vivid", "natural"). DALL-E 3 specific. */
  style?: string;

  /** Background mode (e.g. "auto", "transparent", "opaque"). GPT-Image specific. */
  background?: string;
}

export interface GeneratedImage {
  /** Base64-encoded image data (or URL for 3D models). */
  base64: string;

  /** Image format (e.g. "png", "jpeg"). */
  format: string;

  /** Image index within the batch. */
  index: number;
}

export interface ImageResponse {
  /** Generated images. */
  images: GeneratedImage[];

  /** Model that generated the images. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface ImageEditRequest {
  /** Editing model (e.g. "gpt-image-1", "grok-imagine-image"). */
  model: string;

  /** Describes the desired edit. */
  prompt: string;

  /** List of base64-encoded input images. */
  input_images: string[];

  /** Number of edited images to generate (default 1). */
  count?: number;

  /** Output dimensions. */
  size?: string;
}

/** Image edit response (same shape as generation). */
export type ImageEditResponse = ImageResponse;

// ── Audio ──────────────────────────────────────────────────────────

export interface TTSRequest {
  /** TTS model (e.g. "tts-1", "eleven_multilingual_v2", "grok-3-tts"). */
  model: string;

  /** Text to synthesise into speech. */
  text: string;

  /** Voice to use (e.g. "alloy", "echo", "nova", "Rachel"). */
  voice?: string;

  /** Audio format (e.g. "mp3", "wav", "opus"). Default: "mp3". */
  format?: string;

  /** Speech rate (provider-dependent). */
  speed?: number;
}

export interface TTSResponse {
  /** Base64-encoded audio data. */
  audio_base64: string;

  /** Audio format (e.g. "mp3"). */
  format: string;

  /** Audio file size in bytes. */
  size_bytes: number;

  /** Model that generated the audio. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface STTRequest {
  /** STT model (e.g. "whisper-1", "scribe_v2"). */
  model: string;

  /** Base64-encoded audio data. */
  audio_base64: string;

  /** Original filename (helps with format detection). Default: "audio.mp3". */
  filename?: string;

  /** BCP-47 language code hint (e.g. "en", "de"). */
  language?: string;
}

export interface STTResponse {
  /** Transcribed text. */
  text: string;

  /** Model that performed transcription. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface MusicRequest {
  /** Music generation model (e.g. "lyria"). */
  model: string;

  /** Describes the music to generate. */
  prompt: string;

  /** Target duration in seconds (default 30). */
  duration_seconds?: number;
}

export interface MusicClip {
  /** Base64-encoded audio data. */
  base64: string;

  /** Audio format (e.g. "mp3", "wav"). */
  format: string;

  /** Audio file size in bytes. */
  size_bytes: number;

  /** Clip index within the batch. */
  index: number;
}

export interface MusicResponse {
  /** Generated music clips. */
  audio_clips: MusicClip[];

  /** Model that generated the music. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface SoundEffectRequest {
  /** Text prompt describing the sound effect. */
  prompt: string;

  /** Optional duration in seconds. */
  duration_seconds?: number;
}

export interface SoundEffectResponse {
  /** Base64-encoded audio data. */
  audio_base64: string;

  /** Audio format (e.g. "mp3"). */
  format: string;

  /** File size in bytes. */
  size_bytes: number;

  /** Model used. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

// ── Video ──────────────────────────────────────────────────────────

export interface VideoRequest {
  /** Video generation model (e.g. "heygen", "grok-imagine-video", "sora-2", "veo-2"). */
  model: string;

  /** Describes the video to generate. */
  prompt: string;

  /** Target video duration in seconds (default 8). */
  duration_seconds?: number;

  /** Video aspect ratio (e.g. "16:9", "9:16"). */
  aspect_ratio?: string;
}

export interface GeneratedVideo {
  /** Base64-encoded video data (or URL). */
  base64: string;

  /** Video format (e.g. "mp4"). */
  format: string;

  /** Video file size in bytes. */
  size_bytes: number;

  /** Video index within the batch. */
  index: number;
}

export interface VideoResponse {
  /** Generated videos. */
  videos: GeneratedVideo[];

  /** Model that generated the videos. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

// ── Embeddings ─────────────────────────────────────────────────────

export interface EmbedRequest {
  /** Embedding model (e.g. "text-embedding-3-small", "text-embedding-3-large"). */
  model: string;

  /** List of texts to embed. */
  input: string[];
}

export interface EmbedResponse {
  /** Embedding vectors, one per input string. */
  embeddings: number[][];

  /** Model that generated the embeddings. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

// ── Documents ──────────────────────────────────────────────────────

export interface DocumentRequest {
  /** Base64-encoded file content. */
  file_base64: string;

  /** Original filename (helps determine file type). */
  filename: string;

  /** Desired output format (e.g. "markdown", "text"). */
  output_format?: string;
}

export interface DocumentResponse {
  /** Extracted text content. */
  content: string;

  /** Format of the extracted content (e.g. "markdown"). */
  format: string;

  /** Provider-specific metadata about the document. */
  meta?: Record<string, unknown>;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

// ── RAG ────────────────────────────────────────────────────────────

export interface RAGSearchRequest {
  /** Search query. */
  query: string;

  /** Filter by corpus name or ID (fuzzy match). Omit to search all corpora. */
  corpus?: string;

  /** Maximum number of results (default 10). */
  top_k?: number;
}

export interface RAGResult {
  /** Source document URI. */
  source_uri: string;

  /** Display name of the source. */
  source_name: string;

  /** Matching text chunk. */
  text: string;

  /** Relevance score. */
  score: number;

  /** Vector distance (lower is more similar). */
  distance: number;
}

export interface RAGSearchResponse {
  /** Matching document chunks. */
  results: RAGResult[];

  /** Original search query. */
  query: string;

  /** Corpora that were searched. */
  corpora?: string[];

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface RAGCorpus {
  /** Full resource name. */
  name: string;

  /** Human-readable name. */
  displayName: string;

  /** Describes the corpus contents. */
  description: string;

  /** Corpus state (e.g. "ACTIVE"). */
  state: string;
}

export interface SurrealRAGSearchRequest {
  /** Search query. */
  query: string;

  /** Filter by documentation provider (e.g. "xai", "claude", "heygen"). */
  provider?: string;

  /** Maximum number of results (default 10, max 50). */
  limit?: number;
}

export interface SurrealRAGResult {
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

export interface SurrealRAGSearchResponse {
  /** Matching documentation chunks. */
  results: SurrealRAGResult[];

  /** Original search query. */
  query: string;

  /** Provider filter that was applied. */
  provider?: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

// ── Models ─────────────────────────────────────────────────────────

export interface ModelInfo {
  /** Model identifier used in API requests. */
  id: string;

  /** Upstream provider (e.g. "anthropic", "xai", "openai"). */
  provider: string;

  /** Human-readable model name. */
  display_name: string;

  /** Cost per million input tokens in USD. */
  input_per_million: number;

  /** Cost per million output tokens in USD. */
  output_per_million: number;
}

export interface PricingInfo {
  /** Model identifier. */
  id: string;

  /** Upstream provider. */
  provider: string;

  /** Human-readable model name. */
  display_name: string;

  /** Cost per million input tokens in USD. */
  input_per_million: number;

  /** Cost per million output tokens in USD. */
  output_per_million: number;
}

// ── Account ────────────────────────────────────────────────────────

export interface BalanceResponse {
  /** User identifier. */
  user_id: string;

  /** Credit balance in ticks. */
  credit_ticks: number;

  /** Credit balance in USD. */
  credit_usd: number;

  /** Conversion rate: ticks per USD. */
  ticks_per_usd: number;
}

export interface UsageEntry {
  /** Ledger entry ID. */
  id: string;

  /** Associated request ID. */
  request_id?: string;

  /** Model used. */
  model?: string;

  /** Upstream provider. */
  provider?: string;

  /** API endpoint called. */
  endpoint?: string;

  /** Cost delta in ticks (negative = spend). */
  delta_ticks?: number;

  /** Balance after this entry. */
  balance_after?: number;

  /** Input tokens consumed. */
  input_tokens?: number;

  /** Output tokens generated. */
  output_tokens?: number;

  /** ISO 8601 timestamp. */
  created_at?: string;
}

export interface UsageResponse {
  /** Ledger entries. */
  entries: UsageEntry[];

  /** Whether more entries exist beyond this page. */
  has_more: boolean;

  /** Cursor for next page (pass as start_after). */
  next_cursor?: string;
}

export interface UsageQuery {
  /** Max entries per page (default 20, max 100). */
  limit?: number;

  /** Cursor for pagination (from previous response's next_cursor). */
  start_after?: string;
}

export interface UsageSummaryMonth {
  /** Month in YYYY-MM format. */
  month: string;

  /** Total API requests in the month. */
  total_requests: number;

  /** Total input tokens consumed. */
  total_input_tokens: number;

  /** Total output tokens generated. */
  total_output_tokens: number;

  /** Total cost in USD. */
  total_cost_usd: number;

  /** Total margin in USD. */
  total_margin_usd: number;

  /** Breakdown by provider. */
  by_provider?: unknown[];
}

export interface UsageSummaryResponse {
  /** Monthly summaries. */
  months: UsageSummaryMonth[];
}

export interface PricingEntry {
  /** Upstream provider. */
  provider: string;

  /** Model identifier. */
  model: string;

  /** Human-readable model name. */
  display_name: string;

  /** Cost per million input tokens in USD. */
  input_per_million: number;

  /** Cost per million output tokens in USD. */
  output_per_million: number;

  /** Cost per million cached tokens in USD. */
  cached_per_million: number;
}

export interface AccountPricingResponse {
  /** Map of model ID to pricing entry. */
  pricing: Record<string, PricingEntry>;
}

// ── Jobs ───────────────────────────────────────────────────────────

export interface JobCreateRequest {
  /** Job type (e.g. "video/generate", "audio/music"). */
  type: string;

  /** Job parameters (model-specific). */
  params: Record<string, unknown>;
}

export interface JobCreateResponse {
  /** Unique job identifier for polling. */
  job_id: string;

  /** Initial job status. */
  status: string;
}

export interface JobStatusResponse {
  /** Job identifier. */
  job_id: string;

  /** Current status: "pending", "processing", "completed", "failed", "timeout". */
  status: string;

  /** Job result payload (present when completed). */
  result?: Record<string, unknown>;

  /** Error message (present when failed or timed out). */
  error?: string;

  /** Total cost in ticks. */
  cost_ticks: number;
}

// ── Session Chat ──────────────────────────────────────────────────

export interface SessionToolResult {
  /** References the tool_use ID from the previous response. */
  tool_call_id: string;

  /** Tool execution result content. */
  content: string;

  /** Whether the tool execution failed. */
  is_error?: boolean;
}

export interface ContextConfig {
  /** Maximum tokens for conversation context. */
  max_tokens?: number;

  /** Strategy for managing context overflow (e.g. "compact", "truncate"). */
  strategy?: string;
}

export interface SessionChatRequest {
  /** Session ID. If empty, a new session is created. */
  session_id?: string;

  /** New user message (required unless tool_results provided). */
  message: string;

  /** Model override (uses session model if not set). */
  model?: string;

  /** Tools for this request. */
  tools?: ChatTool[];

  /** Tool results from previous tool_use response. */
  tool_results?: SessionToolResult[];

  /** Enable SSE streaming. */
  stream?: boolean;

  /** System prompt (used when creating a new session). */
  system_prompt?: string;

  /** Context management config (used when creating a new session). */
  context_config?: ContextConfig;

  /** Provider-specific passthrough. */
  provider_options?: Record<string, Record<string, unknown>>;
}

export interface ContextMetadata {
  /** Number of turns in the conversation. */
  turn_count: number;

  /** Estimated token count of the conversation context. */
  estimated_tokens: number;

  /** Whether the conversation was compacted. */
  compacted?: boolean;

  /** Compaction note (if compacted). */
  compaction_note?: string;

  /** Number of tool turns cleared. */
  tools_cleared?: number;
}

export interface SessionChatResponse {
  /** Session identifier (reuse for subsequent requests). */
  session_id: string;

  /** The assistant's response. */
  response: ChatResponse;

  /** Context metadata about the conversation state. */
  context?: ContextMetadata;
}

// ── Agent ─────────────────────────────────────────────────────────

export interface AgentWorkerConfig {
  /** Worker name. */
  name: string;

  /** Model to use for this worker. */
  model: string;

  /** Cost tier: "cheap", "mid", or "expensive". */
  tier: string;

  /** Describes the worker's capabilities. */
  description: string;
}

export interface AgentRequest {
  /** Session ID (optional — creates new if empty). */
  session_id?: string;

  /** The user's task (required). */
  task: string;

  /** Conductor model (default: claude-sonnet-4-6). */
  conductor_model?: string;

  /** Worker configurations. If empty, uses default team. */
  workers?: AgentWorkerConfig[];

  /** Maximum orchestration steps (default 10). */
  max_steps?: number;

  /** System prompt for the conductor. */
  system_prompt?: string;

  /** Context config for session management. */
  context_config?: ContextConfig;
}

/** SSE event from the agent endpoint. */
export interface AgentEvent {
  /** Event type: "agent_session", "agent_step", "agent_result", "agent_error", "usage", "done". */
  type: string;

  /** Session ID (present on agent_session events). */
  session_id?: string;

  /** Step number (present on agent_step events). */
  step?: number;

  /** Worker role (present on agent_step events). */
  role?: string;

  /** Worker tier (present on agent_step events). */
  tier?: string;

  /** Step duration in ms (present on agent_step events). */
  duration?: number;

  /** Whether work was delegated (present on agent_step events). */
  delegated?: boolean;

  /** Response preview (present on agent_step events). */
  response_preview?: string;

  /** Final content (present on agent_result events). */
  content?: string;

  /** Cost breakdown (present on agent_result events). */
  cost?: Record<string, unknown>;

  /** Total steps (present on agent_result events). */
  total_steps?: number;

  /** Duration in ms (present on agent_result events). */
  duration_ms?: number;

  /** Error message (present on agent_error events). */
  message?: string;

  /** Token usage (present on usage events). */
  usage?: ChatUsage;

  /** True when the stream is complete. */
  done: boolean;

  /** Raw event data for untyped fields. */
  [key: string]: unknown;
}

// ── Missions ──────────────────────────────────────────────────────

export interface MissionWorkerConfig {
  /** Model to use for this worker. */
  model: string;

  /** Cost tier: "cheap", "mid", or "expensive". */
  tier: string;

  /** Describes the worker's capabilities. */
  description?: string;
}

export interface MissionRequest {
  /** High-level task description (required). */
  goal: string;

  /** Execution strategy: "wave" (default), "dag", "mapreduce", "refinement", "branch". */
  strategy?: string;

  /** Conductor model (default: claude-sonnet-4-6). */
  conductor_model?: string;

  /** Worker configurations keyed by name. If empty, uses cost-optimized defaults. */
  workers?: Record<string, MissionWorkerConfig>;

  /** Maximum orchestration steps (default 25). */
  max_steps?: number;

  /** System prompt for the conductor. */
  system_prompt?: string;

  /** Session ID for conversation context. */
  session_id?: string;

  /** If true, conductor generates a plan before executing. Default: true. */
  auto_plan?: boolean;

  /** Context config for session management. */
  context_config?: ContextConfig;
}

/** SSE event from the missions endpoint. */
export interface MissionEvent {
  /** Event type: "mission_started", "step_detail", "mission_completed", "mission_failed", "usage", "done". */
  type: string;

  /** Session ID (present on mission_started events). */
  session_id?: string;

  /** Conductor model (present on mission_started events). */
  conductor?: string;

  /** Execution strategy (present on mission_started events). */
  strategy?: string;

  /** Worker info (present on mission_started events). */
  workers?: Record<string, unknown>;

  /** Step number (present on step_detail events). */
  step?: number;

  /** Worker role (present on step_detail events). */
  role?: string;

  /** Worker tier (present on step_detail events). */
  tier?: string;

  /** Step duration in ms (present on step_detail events). */
  duration?: number;

  /** Whether work was delegated (present on step_detail events). */
  delegated?: boolean;

  /** Final content (present on mission_completed events). */
  content?: string;

  /** Cost breakdown (present on mission_completed events). */
  cost?: Record<string, unknown>;

  /** Total steps (present on mission_completed events). */
  total_steps?: number;

  /** Duration in ms (present on mission_completed events). */
  duration_ms?: number;

  /** Error message (present on mission_failed events). */
  message?: string;

  /** Token usage (present on usage events). */
  usage?: ChatUsage;

  /** True when the stream is complete. */
  done: boolean;

  /** Raw event data for untyped fields. */
  [key: string]: unknown;
}

// ── API Keys ──────────────────────────────────────────────────────

export interface CreateKeyRequest {
  /** Human-readable key name. */
  name: string;

  /** Allowed endpoint prefixes (e.g. ["/qai/v1/chat"]). If empty, all endpoints. */
  endpoints?: string[];

  /** Maximum spend in USD (converted to ticks internally). */
  spend_cap_usd?: number;

  /** Maximum requests per minute. */
  rate_limit?: number;
}

export interface KeyDetails {
  /** Key ID. */
  id: string;

  /** Key name. */
  name: string;

  /** Key prefix (e.g. "qai_..."). */
  prefix: string;

  /** Allowed endpoints. */
  endpoints?: string[];

  /** Spend cap in ticks. */
  spend_cap_ticks?: number;

  /** Rate limit (requests per minute). */
  rate_limit?: number;

  /** ISO 8601 creation timestamp. */
  created_at: string;
}

export interface CreateKeyResponse {
  /** The raw API key (shown only once). */
  key: string;

  /** Key metadata. */
  details: KeyDetails;
}

export interface ListKeysResponse {
  /** All API keys for the user. */
  keys: KeyDetails[];
}

// ── Compute ───────────────────────────────────────────────────────

export interface ComputeTemplate {
  /** Template identifier. */
  id: string;

  /** Human-readable name. */
  name: string;

  /** GCE machine type (e.g. "g2-standard-4"). */
  machine_type: string;

  /** GPU type (e.g. "nvidia-l4"). */
  gpu_type: string;

  /** Number of GPUs. */
  gpu_count: number;

  /** VRAM in GB. */
  vram_gb: number;

  /** RAM in GB. */
  ram_gb: number;

  /** vCPUs. */
  vcpus: number;

  /** Available zones. */
  available_zones: string[];

  /** Hourly cost in USD. */
  hourly_usd: number;

  /** Spot hourly cost in USD. */
  spot_hourly_usd?: number;

  /** Whether spot instances are allowed. */
  spot_allowed: boolean;

  /** Estimated boot time in seconds. */
  boot_time_secs: number;
}

export interface TemplatesResponse {
  /** Available compute templates. */
  templates: ComputeTemplate[];
}

export interface ProvisionRequest {
  /** Template ID (e.g. "gpu-l4-small"). */
  template: string;

  /** GCE zone (optional — defaults to first available). */
  zone?: string;

  /** Use spot/preemptible instance. */
  spot?: boolean;

  /** Auto-teardown after N minutes of inactivity (default 30). */
  auto_teardown_minutes?: number;

  /** SSH public key to inject. */
  ssh_public_key?: string;
}

export interface ProvisionResponse {
  /** Instance identifier for polling. */
  instance_id: string;

  /** Initial status ("provisioning"). */
  status: string;

  /** Zone the instance was created in. */
  zone: string;

  /** GCE machine type. */
  machine_type: string;

  /** GPU type. */
  gpu_type: string;

  /** Hourly cost in USD. */
  hourly_usd: number;

  /** Initial cost (1hr minimum). */
  cost_usd: number;

  /** Estimated boot time in seconds. */
  estimated_boot_secs: number;
}

export interface ComputeInstanceInfo {
  /** Instance identifier. */
  instance_id: string;

  /** Template used. */
  template: string;

  /** Current status. */
  status: string;

  /** GCE zone. */
  zone: string;

  /** External IP address (null while provisioning). */
  external_ip: string | null;

  /** GPU type. */
  gpu_type: string;

  /** Number of GPUs. */
  gpu_count: number;

  /** Hourly cost in USD. */
  hourly_usd: number;

  /** Accumulated cost in USD. */
  cost_usd: number;

  /** Uptime in minutes. */
  uptime_minutes: number;

  /** Auto-teardown threshold in minutes. */
  auto_teardown_minutes: number;

  /** ISO 8601 last activity timestamp. */
  last_active_at: string;

  /** ISO 8601 creation timestamp. */
  created_at: string;

  /** ISO 8601 termination timestamp (if terminated). */
  terminated_at?: string;
}

export interface InstancesResponse {
  /** List of compute instances. */
  instances: ComputeInstanceInfo[];
}

export interface InstanceDetailInfo extends ComputeInstanceInfo {
  /** Live GCE status. */
  gcp_status?: string;

  /** GCE machine type. */
  machine_type?: string;

  /** Whether this is a spot instance. */
  spot?: boolean;

  /** SSH username. */
  ssh_username?: string;

  /** Error message (if failed). */
  error_message?: string;
}

/** Single instance response uses the detail shape. */
export type InstanceResponse = InstanceDetailInfo;

export interface SSHKeyRequest {
  /** SSH public key to inject. */
  public_key: string;

  /** SSH username (default "cosmic"). */
  username?: string;
}

export interface DeleteResponse {
  /** Instance identifier. */
  instance_id: string;

  /** Final status ("terminated"). */
  status: string;

  /** Final cost in USD. */
  final_cost_usd: number;

  /** Total uptime in minutes. */
  uptime_minutes: number;
}

// ── Voice Management ──────────────────────────────────────────────

export interface VoiceInfo {
  /** Voice identifier. */
  voice_id: string;

  /** Human-readable name. */
  name: string;

  /** Voice category (e.g. "premade", "cloned"). */
  category: string;

  /** Voice description. */
  description?: string;

  /** Preview audio URL. */
  preview_url?: string;
}

export interface VoicesResponse {
  /** Available voices. */
  voices: VoiceInfo[];

  /** Unique request identifier. */
  request_id: string;
}

export interface CloneVoiceRequest {
  /** Name for the cloned voice. */
  name: string;

  /** Voice description. */
  description?: string;

  /** Base64-encoded audio samples. */
  audio_samples: string[];
}

export interface CloneVoiceResponse {
  /** ID of the newly created voice. */
  voice_id: string;

  /** Unique request identifier. */
  request_id: string;
}

// ── Advanced Audio ────────────────────────────────────────────────

export interface DialogueVoice {
  /** ElevenLabs voice ID. */
  voice_id: string;

  /** Speaker name (used in script attribution). */
  name: string;
}

export interface DialogueRequest {
  /** Multi-speaker script text. */
  text: string;

  /** Voice assignments for speakers. */
  voices: DialogueVoice[];

  /** Model (e.g. "eleven_v3"). */
  model?: string;

  /** Output format (e.g. "mp3", "wav"). */
  output_format?: string;

  /** Random seed for reproducibility. */
  seed?: number;
}

export interface DialogueResponse {
  /** Base64-encoded audio data. */
  audio_base64: string;

  /** Audio format. */
  format: string;

  /** Audio file size in bytes. */
  size_bytes: number;

  /** Model used. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface SpeechToSpeechRequest {
  /** Target voice ID. */
  voice_id: string;

  /** Base64-encoded input audio. */
  audio_base64: string;
}

export interface SpeechToSpeechResponse {
  /** Base64-encoded output audio. */
  audio_base64: string;

  /** Audio format. */
  format: string;

  /** Audio file size in bytes. */
  size_bytes: number;

  /** Model used. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface IsolateVoiceRequest {
  /** Base64-encoded audio with background noise. */
  audio_base64: string;

  /** Original filename (helps with format detection). */
  filename?: string;
}

export interface IsolateVoiceResponse {
  /** Base64-encoded clean audio. */
  audio_base64: string;

  /** Audio format. */
  format: string;

  /** Audio file size in bytes. */
  size_bytes: number;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface RemixVoiceRequest {
  /** Base64-encoded input audio. */
  audio_base64: string;

  /** Original filename. */
  filename?: string;

  /** Target gender. */
  gender?: string;

  /** Target accent. */
  accent?: string;

  /** Target style. */
  style?: string;

  /** Target pacing. */
  pacing?: string;

  /** Audio quality setting. */
  audio_quality?: string;

  /** Prompt strength. */
  prompt_strength?: string;

  /** Optional script for the remix. */
  script?: string;
}

export interface RemixVoiceResponse {
  /** Base64-encoded output audio. */
  audio_base64?: string;

  /** Audio format. */
  format: string;

  /** Audio file size in bytes. */
  size_bytes: number;

  /** Generated voice ID. */
  voice_id?: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface DubRequest {
  /** Base64-encoded audio (provide this or source_url). */
  audio_base64?: string;

  /** Original filename. */
  filename?: string;

  /** Source URL (provide this or audio_base64). */
  source_url?: string;

  /** Source language BCP-47 code. */
  source_lang?: string;

  /** Target language BCP-47 code (required). */
  target_lang: string;

  /** Number of speakers. */
  num_speakers?: number;

  /** Use highest resolution. */
  highest_resolution?: boolean;
}

export interface DubResponse {
  /** Dubbing job ID. */
  dubbing_id: string;

  /** Base64-encoded dubbed audio. */
  audio_base64: string;

  /** Audio format. */
  format: string;

  /** Target language. */
  target_lang: string;

  /** Job status. */
  status: string;

  /** Processing time in seconds. */
  processing_time_seconds: number;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface AlignRequest {
  /** Base64-encoded audio. */
  audio_base64: string;

  /** Original filename. */
  filename?: string;

  /** Text to align against. */
  text: string;

  /** BCP-47 language code. */
  language?: string;
}

export interface AlignedWord {
  /** Word text. */
  text: string;

  /** Start time in seconds. */
  start_time: number;

  /** End time in seconds. */
  end_time: number;

  /** Alignment confidence (0-1). */
  confidence: number;
}

export interface AlignResponse {
  /** Word-level alignment timestamps. */
  alignment: AlignedWord[];

  /** Model used. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface VoiceDesignRequest {
  /** Natural language description of the desired voice. */
  voice_description: string;

  /** Sample text the voice previews will speak. */
  sample_text: string;
}

export interface VoicePreview {
  /** Generated voice ID (can be used for TTS). */
  generated_voice_id: string;

  /** Base64-encoded preview audio. */
  audio_base64: string;

  /** Audio format. */
  format: string;
}

export interface VoiceDesignResponse {
  /** Generated voice previews. */
  previews: VoicePreview[];

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface StarfishTTSRequest {
  /** Text to synthesize. */
  text: string;

  /** HeyGen voice ID. */
  voice_id: string;

  /** Input type (e.g. "text", "ssml"). */
  input_type?: string;

  /** Speech rate multiplier. */
  speed?: number;

  /** Language code. */
  language?: string;

  /** Locale code. */
  locale?: string;
}

export interface StarfishTTSResponse {
  /** Base64-encoded audio data (if available). */
  audio_base64?: string;

  /** Audio URL (if available). */
  url?: string;

  /** Audio format. */
  format: string;

  /** Audio file size in bytes. */
  size_bytes: number;

  /** Audio duration in seconds. */
  duration: number;

  /** Model used. */
  model: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

// ── HeyGen Video ─────────────────────────────────────────────────

export interface VideoStudioRequest {
  /** HeyGen avatar ID. */
  avatar_id: string;

  /** Script for the avatar to speak. */
  script: string;

  /** Voice ID. */
  voice_id: string;
}

export interface VideoTranslateRequest {
  /** URL of the video to translate. */
  video_url: string;

  /** Target output language. */
  output_language: string;

  /** Source language (optional, auto-detected). */
  source_language?: string;

  /** Job title. */
  title?: string;
}

export interface PhotoAvatarRequest {
  /** Avatar name. */
  name: string;

  /** Age description. */
  age: string;

  /** Gender. */
  gender: string;

  /** Ethnicity. */
  ethnicity: string;

  /** Orientation. */
  orientation: string;

  /** Pose. */
  pose: string;

  /** Visual style. */
  style: string;

  /** Appearance description. */
  appearance: string;
}

export interface DigitalTwinRequest {
  /** Training video URL. */
  video_url: string;

  /** Consent video URL. */
  consent_video_url: string;

  /** Digital twin name. */
  name: string;

  /** Description. */
  description?: string;

  /** Avatar group ID. */
  avatar_group_id?: string;

  /** Callback URL for completion notification. */
  callback_url?: string;
}

/** Async job response (returned by video/studio, video/translate, video/photo-avatar, video/digital-twin). */
export interface AsyncJobResponse {
  /** Job identifier for polling. */
  job_id: string;

  /** Initial status ("pending"). */
  status: string;

  /** Job type. */
  type: string;

  /** Unique request identifier. */
  request_id: string;
}

export interface HeyGenAvatar {
  /** Avatar ID. */
  avatar_id: string;

  /** Avatar name. */
  avatar_name: string;

  /** Additional avatar properties. */
  [key: string]: unknown;
}

export interface AvatarsResponse {
  /** Available avatars. */
  avatars: HeyGenAvatar[];

  /** Unique request identifier. */
  request_id: string;
}

export interface HeyGenTemplate {
  /** Template ID. */
  template_id: string;

  /** Template name. */
  name: string;

  /** Additional template properties. */
  [key: string]: unknown;
}

export interface HeyGenTemplatesResponse {
  /** Available templates. */
  templates: HeyGenTemplate[];

  /** Unique request identifier. */
  request_id: string;
}

export interface HeyGenVoice {
  /** Voice ID. */
  voice_id: string;

  /** Voice name. */
  name?: string;

  /** Additional voice properties. */
  [key: string]: unknown;
}

export interface HeyGenVoicesResponse {
  /** Available voices. */
  voices: HeyGenVoice[];

  /** Unique request identifier. */
  request_id: string;
}

// ── Documents (additional) ────────────────────────────────────────

export interface ChunkDocumentRequest {
  /** Base64-encoded file content. */
  file_base64: string;

  /** Original filename. */
  filename: string;

  /** Chunk strategy (e.g. "paragraph", "sentence"). */
  strategy?: string;

  /** Maximum chunk size in tokens. */
  max_chunk_tokens?: number;
}

export interface DocumentChunk {
  /** Chunk index. */
  index: number;

  /** Chunk text content. */
  text: string;

  /** Token count estimate. */
  tokens?: number;
}

export interface ChunkDocumentResponse {
  /** Document chunks. */
  chunks: DocumentChunk[];

  /** Total chunks. */
  total_chunks: number;

  /** Extraction metadata. */
  meta?: Record<string, unknown>;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

export interface ProcessDocumentRequest {
  /** Base64-encoded file content. */
  file_base64: string;

  /** Original filename. */
  filename: string;

  /** Processing instructions. */
  instructions?: string;
}

export interface ProcessDocumentResponse {
  /** Processed content. */
  content: string;

  /** Output format. */
  format: string;

  /** Processing metadata. */
  meta?: Record<string, unknown>;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** Unique request identifier. */
  request_id: string;
}

// ── Jobs (additional) ─────────────────────────────────────────────

export interface JobListItem {
  /** Job identifier. */
  job_id: string;

  /** Job type. */
  type: string;

  /** Current status. */
  status: string;

  /** Error message (if failed). */
  error?: string;

  /** Total cost in ticks. */
  cost_ticks: number;

  /** ISO 8601 creation timestamp. */
  created_at: string;

  /** ISO 8601 start timestamp. */
  started_at?: string;

  /** ISO 8601 completion timestamp. */
  completed_at?: string;

  /** Request ID. */
  request_id: string;
}

export interface JobListResponse {
  /** Jobs for the user. */
  jobs: JobListItem[];

  /** Unique request identifier. */
  request_id: string;
}

// ── RAG (additional) ──────────────────────────────────────────────

export interface SurrealRAGProviderInfo {
  /** Provider name. */
  provider: string;

  /** Number of indexed chunks. */
  chunks: number;
}

export interface SurrealRAGProvidersResponse {
  /** Available documentation providers. */
  providers: SurrealRAGProviderInfo[];

  /** Unique request identifier. */
  request_id: string;
}

// ── Contact ───────────────────────────────────────────────────────

export interface ContactRequest {
  /** Sender name. */
  name: string;

  /** Sender email address. */
  email: string;

  /** Message body. */
  message: string;
}

// ── Status ────────────────────────────────────────────────────────

/** Generic status response used by many endpoints. */
export interface StatusResponse {
  /** Status string (e.g. "revoked", "deleted", "alive", "sent"). */
  status: string;

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
