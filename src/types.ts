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
