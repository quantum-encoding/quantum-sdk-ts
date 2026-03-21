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
  role: "system" | "user" | "assistant" | "tool";
  content?: string;
  content_blocks?: ContentBlock[];
  tool_call_id?: string;
  is_error?: boolean;
}

export interface ChatTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ChatUsage {
  input_tokens: number;
  output_tokens: number;
  cost_ticks: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  content: ContentBlock[];
  usage: ChatUsage;
  stop_reason: string;
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

export interface StreamEvent {
  type: string;
  delta?: StreamDelta;
  tool_use?: StreamToolUse;
  usage?: ChatUsage;
  error?: string;
  done?: boolean;
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

// ── Agent ──────────────────────────────────────────────────────────

export interface AgentRequest {
  /** The task or goal for the agent to accomplish. */
  task: string;

  /** Model for the conductor (default: server picks). */
  conductor_model?: string;

  /** Worker configurations. */
  workers?: AgentWorkerConfig[];

  /** Maximum number of orchestration steps. */
  max_steps?: number;

  /** System prompt for the conductor. */
  system_prompt?: string;
}

export interface AgentWorkerConfig {
  name: string;
  model?: string;
  tools?: ChatTool[];
  system_prompt?: string;
}

export interface AgentEvent {
  type: string;
  worker?: string;
  content?: string;
  tool_use?: StreamToolUse;
  error?: string;
  [key: string]: unknown;
}

// ── Mission ────────────────────────────────────────────────────────

export interface MissionRequest {
  /** The goal for the mission. */
  goal: string;

  /** Model for the conductor. */
  conductor_model?: string;

  /** Worker configurations. */
  workers?: MissionWorkerConfig[];

  /** Maximum orchestration steps. */
  max_steps?: number;
}

export interface MissionWorkerConfig {
  name: string;
  model?: string;
  tools?: ChatTool[];
  system_prompt?: string;
}

export interface MissionEvent {
  type: string;
  worker?: string;
  content?: string;
  tool_use?: StreamToolUse;
  error?: string;
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

  /** Image size (e.g. "1024x1024"). */
  size?: string;

  /** Quality level (e.g. "standard", "hd"). */
  quality?: string;
}

export interface GeneratedImage {
  url?: string;
  b64_json?: string;
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
  image: string;

  /** Optional mask image for inpainting. */
  mask?: string;

  /** Image size. */
  size?: string;

  /** Number of images. */
  n?: number;
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

  /** Model to use for music generation. */
  model?: string;
}

export interface MusicClip {
  audio_url: string;
  title?: string;
  tags?: string;
  duration_seconds: number;
}

export interface MusicResponse {
  clips: MusicClip[];
  request_id: string;
  cost_ticks: number;
}

export interface SoundEffectRequest {
  /** Text prompt describing the sound effect. */
  text: string;

  /** Duration in seconds. */
  duration_seconds?: number;

  /** Whether to generate multiple variations. */
  prompt_influence?: number;
}

export interface SoundEffectResponse {
  audio_url: string;
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
  script: string;

  /** Voice mapping (speaker name -> voice ID). */
  voices: Record<string, string>;

  /** Model for dialogue generation. */
  model?: string;
}

export interface DialogueResponse {
  audio_url: string;
  duration_seconds: number;
  request_id: string;
  cost_ticks: number;
}

export interface SpeechToSpeechRequest {
  /** Base64-encoded source audio. */
  audio: string;

  /** Target voice ID. */
  voice_id: string;

  /** Model for voice conversion. */
  model?: string;
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
  audio: string;

  /** Target language code. */
  target_lang: string;

  /** Source language code. */
  source_lang?: string;
}

export interface DubResponse {
  audio_url: string;
  request_id: string;
  cost_ticks: number;
}

export interface AlignRequest {
  /** Base64-encoded audio. */
  audio: string;

  /** Text to align against the audio. */
  text: string;
}

export interface AlignedWord {
  word: string;
  start: number;
  end: number;
}

export interface AlignResponse {
  words: AlignedWord[];
  request_id: string;
  cost_ticks: number;
}

export interface VoiceDesignRequest {
  /** Text description of the desired voice. */
  description: string;

  /** Text to preview the voice with. */
  preview_text?: string;
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
}

export interface StarfishTTSResponse {
  audio_url: string;
  duration_seconds: number;
  request_id: string;
  cost_ticks: number;
}

// ── Video ──────────────────────────────────────────────────────────

export interface VideoRequest {
  /** Model for video generation. */
  model: string;

  /** Text prompt. */
  prompt: string;

  /** Duration in seconds. */
  duration?: number;

  /** Resolution (e.g. "720p", "1080p"). */
  resolution?: string;
}

export interface GeneratedVideo {
  url: string;
  duration_seconds: number;
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
  image: string;
}

export interface DigitalTwinRequest {
  /** Base64-encoded training video. */
  video: string;
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
}

export interface HeyGenVoice {
  voice_id: string;
  name: string;
  language?: string;
  [key: string]: unknown;
}

export interface HeyGenVoicesResponse {
  voices: HeyGenVoice[];
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
  content: string;

  /** Content type (e.g. "pdf", "image", "url"). */
  type?: string;

  /** Model for extraction. */
  model?: string;
}

export interface DocumentResponse {
  text: string;
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
  tokens: number;
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
  Provider: string;
  Model: string;
  DisplayName: string;
  InputPerMillion: number;
  OutputPerMillion: number;
  CachedPerMillion?: number;
}

export interface AccountPricingResponse {
  pricing: Record<string, PricingEntry>;
}

// ── Jobs ──────────────────────────────────────────────────────────

export interface JobCreateRequest {
  type: string;
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

// ── API Keys ──────────────────────────────────────────────────────

export interface CreateKeyRequest {
  name: string;
  scopes?: string[];
  expires_at?: string;
}

export interface CreateKeyResponse {
  key: string;
  id: string;
}

export interface KeyDetails {
  id: string;
  name: string;
  prefix: string;
  scopes?: string[];
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
}

export interface ListKeysResponse {
  keys: KeyDetails[];
}

// ── Compute ───────────────────────────────────────────────────────

export interface ComputeTemplate {
  id: string;
  name: string;
  gpu_type: string;
  gpu_count: number;
  vcpus: number;
  ram_gb: number;
  disk_gb: number;
  price_per_hour: number;
  [key: string]: unknown;
}

export interface TemplatesResponse {
  templates: ComputeTemplate[];
}

export interface ProvisionRequest {
  template_id: string;
  region?: string;
  ssh_public_key?: string;
}

export interface ProvisionResponse {
  instance_id: string;
  status: string;
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
