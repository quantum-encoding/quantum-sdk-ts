import { parseAPIError } from "./errors.js";
import { chat, chatStream } from "./chat.js";
import { chatSession } from "./session.js";
import { agentRun, missionRun } from "./agent.js";
import { generateImage, editImage } from "./image.js";
import {
  speak,
  transcribe,
  soundEffects,
  generateMusic,
  dialogue,
  speechToSpeech,
  isolateVoice,
  remixVoice,
  dub,
  align,
  voiceDesign,
  starfishTTS,
  searchAudioSounds,
} from "./audio.js";
import {
  generateVideo,
  videoStudio,
  videoTranslate,
  videoPhotoAvatar,
  videoDigitalTwin,
  videoAvatars,
  videoTemplates,
  videoHeygenVoices,
  videoTemplateDetail,
  videoTemplateGenerate,
  videoBatchSubmit,
  videoBatchStatus,
} from "./video.js";
import {
  createAvatarRealtimeSession,
  getAvatarRealtimeSession,
  sendAvatarRealtimeText,
  cancelAvatarRealtimeSession,
} from "./avatar.js";
import { embed } from "./embeddings.js";
import { extractDocument, chunkDocument, processDocument } from "./documents.js";
import { ragSearch, ragCorpora, surrealRagSearch, surrealRagProviders } from "./rag.js";
import { listModels, getPricing } from "./models.js";
import {
  accountBalance,
  accountUsage,
  accountUsageSummary,
  accountPricing,
} from "./account.js";
import { createJob, getJob, pollJob, listJobs, chatJob, streamJob, generate3D } from "./jobs.js";
import { webSearch, searchContext, searchAnswer } from "./search.js";
import type { BillingRequest, BillingResponse } from "./compute-billing.js";
import { createKey, listKeys, revokeKey } from "./keys.js";
import {
  computeTemplates,
  computeProvision,
  computeInstances,
  computeInstance,
  computeDelete,
  computeSSHKey,
  computeKeepalive,
} from "./compute.js";
import { listVoices, cloneVoice, deleteVoice } from "./voices.js";
import { realtimeConnect, realtimeConnectDirect, realtimeSession, realtimeEnd, realtimeRefresh, RealtimeSender, RealtimeReceiver } from "./realtime.js";
import type { RealtimeConfig, RealtimeSession } from "./realtime.js";
import { batchSubmit, batchSubmitJsonl, batchJobs, batchJob } from "./batch.js";
import { creditPacks, creditPurchase, creditBalance, creditTiers, devProgramApply } from "./credits.js";
import { authApple } from "./auth.js";
import type {
  AccountPricingResponse,
  AgentEvent,
  AgentPassthroughRequest,
  AgentPassthroughResponse,
  AgentRequest,
  AlignRequest,
  AlignResponse,
  AsyncJobResponse,
  AudioSoundsQuery,
  AudioSoundsResponse,
  AuthAppleRequest,
  AuthResponse,
  AvatarRealtimeCancelResponse,
  AvatarRealtimeCreateResponse,
  AvatarRealtimeRequest,
  AvatarRealtimeStatusResponse,
  AvatarRealtimeTextRequest,
  AvatarRealtimeTextResponse,
  AvatarsResponse,
  BalanceResponse,
  BatchJobInfo,
  BatchJobsResponse,
  BatchJsonlResponse,
  BatchSubmitRequest,
  BatchSubmitResponse,
  ChatRequest,
  ChatResponse,
  ChunkDocumentRequest,
  ChunkDocumentResponse,
  ClientOptions,
  CloneVoiceRequest,
  CloneVoiceResponse,
  CreateKeyRequest,
  CreateKeyResponse,
  CreditBalanceResponse,
  CreditPacksResponse,
  CreditPurchaseRequest,
  CreditPurchaseResponse,
  CreditTiersResponse,
  DeleteResponse,
  DevProgramApplyRequest,
  DevProgramApplyResponse,
  DialogueRequest,
  DialogueResponse,
  DigitalTwinRequest,
  DocumentRequest,
  DocumentResponse,
  DubRequest,
  DubResponse,
  EmbedRequest,
  EmbedResponse,
  HeyGenTemplatesResponse,
  HeyGenVoicesResponse,
  JobAcceptedResponse,
  ImageEditRequest,
  ImageEditResponse,
  ImageRequest,
  ImageResponse,
  InstanceResponse,
  InstancesResponse,
  IsolateVoiceRequest,
  IsolateVoiceResponse,
  JobCreateRequest,
  JobCreateResponse,
  JobListResponse,
  JobStreamEvent,
  WebSearchRequest,
  WebSearchResponse,
  LLMContextRequest,
  LLMContextResponse,
  SearchAnswerRequest,
  SearchAnswerResponse,
  RemeshRequest,
  RetextureRequest,
  RigRequest,
  AnimateRequest,
  JobStatusResponse,
  ListKeysResponse,
  MissionEvent,
  MissionRequest,
  ModelInfo,
  MusicRequest,
  MusicResponse,
  PhotoAvatarRequest,
  PricingInfo,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  ProvisionRequest,
  ProvisionResponse,
  RAGCorpus,
  RAGSearchRequest,
  RAGSearchResponse,
  RemixVoiceRequest,
  RemixVoiceResponse,
  ResponseMeta,
  SessionChatRequest,
  SessionChatResponse,
  SoundEffectRequest,
  SoundEffectResponse,
  SpeechToSpeechRequest,
  SpeechToSpeechResponse,
  SSHKeyRequest,
  StarfishTTSRequest,
  StarfishTTSResponse,
  StatusResponse,
  STTRequest,
  STTResponse,
  StreamEvent,
  SurrealRAGProvidersResponse,
  SurrealRAGSearchRequest,
  SurrealRAGSearchResponse,
  TemplatesResponse,
  TTSRequest,
  TTSResponse,
  UsageQuery,
  UsageResponse,
  UsageSummaryResponse,
  VideoBatchStatusQuery,
  VideoBatchStatusResponse,
  VideoBatchSubmitRequest,
  VideoBatchSubmitResponse,
  VideoRequest,
  VideoResponse,
  VideoStudioRequest,
  VideoTemplateDetailResponse,
  VideoTemplateGenerateRequest,
  VideoTranslateRequest,
  VoiceDesignRequest,
  VoiceDesignResponse,
  VoicesResponse,
} from "./types.js";
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS } from "./types.js";

/** Options for {@link QuantumClient._doJSON}. @internal */
export interface DoJSONOptions {
  /** Override the auto-generated idempotency key. Reused across retries. */
  idempotencyKey?: string;
  /** Caller AbortSignal; combined with the internal timeout. */
  signal?: AbortSignal;
  /** Max retries on 5xx/network errors (default 2). Never retries 4xx. */
  retries?: number;
}

/**
 * QuantumClient is the Quantum AI API client.
 *
 * @example
 * ```ts
 * const client = new QuantumClient("qai_key_xxx");
 *
 * const resp = await client.chat({
 *   model: "claude-sonnet-4-6",
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * ```
 */
export class QuantumClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly _fetch: typeof globalThis.fetch;
  private readonly timeoutMs: number;
  private readonly idempotencyEnabled: boolean;

  constructor(apiKey: string, options?: ClientOptions) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    this._fetch = options?.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // Default true: auto-generate an Idempotency-Key per mutating request so a
    // network-flake retry is safe against double-billing. Callers can still
    // pass their own key to override.
    this.idempotencyEnabled = options?.idempotencyKey ?? true;
  }

  /** @internal — used by realtime module to build WebSocket URL. */
  get _baseUrl(): string {
    return this.baseUrl;
  }

  /** @internal — used by realtime module for auth. */
  get _apiKey(): string {
    return this.apiKey;
  }

  // ── Chat ──────────────────────────────────────────────────────────

  /** Send a non-streaming chat request. */
  async chat(req: ChatRequest): Promise<ChatResponse> {
    return chat(this, req);
  }

  /**
   * Send a streaming chat request. Returns an AsyncIterableIterator of StreamEvents.
   *
   * @example
   * ```ts
   * for await (const event of client.chatStream({
   *   model: "gpt-5-mini",
   *   messages: [{ role: "user", content: "Write a haiku" }],
   * })) {
   *   process.stdout.write(event.delta?.text ?? "");
   * }
   * ```
   */
  async *chatStream(
    req: ChatRequest,
    signal?: AbortSignal,
  ): AsyncIterableIterator<StreamEvent> {
    yield* chatStream(this, req, signal);
  }

  // ── Session Chat ────────────────────────────────────────────────

  /**
   * Send a session-based chat request. The server manages conversation history.
   *
   * @example
   * ```ts
   * // Start a new session
   * const resp = await client.chatSession({
   *   message: "Hello!",
   *   model: "claude-sonnet-4-6",
   * });
   *
   * // Continue the conversation
   * const resp2 = await client.chatSession({
   *   session_id: resp.session_id,
   *   message: "Tell me more",
   * });
   * ```
   */
  async chatSession(req: SessionChatRequest): Promise<SessionChatResponse> {
    return chatSession(this, req);
  }

  // ── Agent ───────────────────────────────────────────────────────

  /**
   * Run a server-side agent orchestration. Streams SSE events as the
   * conductor delegates work to workers.
   *
   * @example
   * ```ts
   * for await (const event of client.agentRun({
   *   task: "Research the latest AI papers and summarize them",
   * })) {
   *   console.log(event.type, event);
   * }
   * ```
   */
  async *agentRun(
    req: AgentRequest,
    signal?: AbortSignal,
  ): AsyncIterableIterator<AgentEvent> {
    yield* agentRun(this, req, signal);
  }

  /**
   * Non-streaming agent tool-call passthrough (POST /qai/v1/agent).
   *
   * The server does NOT execute tools. It runs the model once and returns
   * any tool_use blocks for the caller to execute locally; the caller then
   * sends the next request with the tool results in the message history.
   * This is the actual contract at /qai/v1/agent — distinct from
   * {@link agentRun}, which streams the /qai/v1/missions orchestration.
   */
  async agent(
    req: AgentPassthroughRequest,
  ): Promise<AgentPassthroughResponse> {
    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages,
    };
    if (req.tools !== undefined) body.tools = req.tools;
    if (req.capabilities !== undefined) body.capabilities = req.capabilities;
    if (req.system_prompt !== undefined) body.system_prompt = req.system_prompt;
    if (req.max_tokens !== undefined) body.max_tokens = req.max_tokens;
    if (req.temperature !== undefined) body.temperature = req.temperature;

    const { data, meta } = await this._doJSON<AgentPassthroughResponse>(
      "POST",
      "/qai/v1/agent",
      body,
    );

    data.request_id = data.request_id || meta.requestId;
    data.cost_ticks = data.cost_ticks || meta.costTicks;
    if (!data.model) data.model = meta.model;
    return data;
  }

  /**
   * Run a full mission orchestration. Streams SSE events as the conductor
   * plans, delegates, and workers execute.
   *
   * @example
   * ```ts
   * for await (const event of client.missionRun({
   *   goal: "Build a REST API server in Go",
   * })) {
   *   console.log(event.type, event);
   * }
   * ```
   */
  async *missionRun(
    req: MissionRequest,
    signal?: AbortSignal,
  ): AsyncIterableIterator<MissionEvent> {
    yield* missionRun(this, req, signal);
  }

  // ── Image ─────────────────────────────────────────────────────────

  /** Generate images from a text prompt. */
  async generateImage(req: ImageRequest): Promise<ImageResponse> {
    return generateImage(this, req);
  }

  /** Edit images using an AI model. */
  async editImage(req: ImageEditRequest): Promise<ImageEditResponse> {
    return editImage(this, req);
  }

  // ── Audio ─────────────────────────────────────────────────────────

  /** Generate speech from text. */
  async speak(req: TTSRequest): Promise<TTSResponse> {
    return speak(this, req);
  }

  /** Convert speech to text. */
  async transcribe(req: STTRequest): Promise<STTResponse> {
    return transcribe(this, req);
  }

  /** Generate sound effects from a text prompt (ElevenLabs). */
  async soundEffects(req: SoundEffectRequest): Promise<SoundEffectResponse> {
    return soundEffects(this, req);
  }

  /** Generate music from a text prompt. */
  async generateMusic(req: MusicRequest): Promise<MusicResponse> {
    return generateMusic(this, req);
  }

  /** Generate multi-speaker dialogue audio (ElevenLabs). */
  async dialogue(req: DialogueRequest): Promise<DialogueResponse> {
    return dialogue(this, req);
  }

  /** Convert speech audio to a different voice (ElevenLabs). */
  async speechToSpeech(
    req: SpeechToSpeechRequest,
  ): Promise<SpeechToSpeechResponse> {
    return speechToSpeech(this, req);
  }

  /** Remove background noise and isolate speech (ElevenLabs). */
  async isolateVoice(
    req: IsolateVoiceRequest,
  ): Promise<IsolateVoiceResponse> {
    return isolateVoice(this, req);
  }

  /** Transform a voice by modifying attributes (ElevenLabs). */
  async remixVoice(req: RemixVoiceRequest): Promise<RemixVoiceResponse> {
    return remixVoice(this, req);
  }

  /** Dub audio/video into a target language (ElevenLabs). */
  async dub(req: DubRequest): Promise<DubResponse> {
    return dub(this, req);
  }

  /** Get word-level timestamps for audio+text alignment (ElevenLabs). */
  async align(req: AlignRequest): Promise<AlignResponse> {
    return align(this, req);
  }

  /** Generate voice previews from a text description (ElevenLabs). */
  async voiceDesign(req: VoiceDesignRequest): Promise<VoiceDesignResponse> {
    return voiceDesign(this, req);
  }

  /** Generate speech using HeyGen's Starfish TTS model. */
  async starfishTTS(req: StarfishTTSRequest): Promise<StarfishTTSResponse> {
    return starfishTTS(this, req);
  }

  /**
   * Search HeyGen's background-music and sound-effects catalogs (semantic
   * ranking, best score first). Unbilled catalog route.
   *
   * `audio_url` values are pre-signed WAV URLs with a limited lifetime —
   * download promptly, do not cache.
   */
  async searchAudioSounds(query: AudioSoundsQuery): Promise<AudioSoundsResponse> {
    return searchAudioSounds(this, query);
  }

  // ── Video ─────────────────────────────────────────────────────────

  /**
   * Generate a video from a text prompt.
   *
   * Video generation is slow (30s-5min). For production use, consider
   * submitting via the Jobs API instead.
   */
  async generateVideo(req: VideoRequest): Promise<VideoResponse> {
    return generateVideo(this, req);
  }

  /** Create a talking-head video via HeyGen Studio. Returns an async job. */
  async videoStudio(req: VideoStudioRequest): Promise<AsyncJobResponse> {
    return videoStudio(this, req);
  }

  /** Submit a video translation job via HeyGen. Returns an async job. */
  async videoTranslate(
    req: VideoTranslateRequest,
  ): Promise<AsyncJobResponse> {
    return videoTranslate(this, req);
  }

  /** Create a photo avatar via HeyGen. Returns an async job. */
  async videoPhotoAvatar(
    req: PhotoAvatarRequest,
  ): Promise<AsyncJobResponse> {
    return videoPhotoAvatar(this, req);
  }

  /** Create a digital twin via HeyGen. Returns an async job. */
  async videoDigitalTwin(
    req: DigitalTwinRequest,
  ): Promise<AsyncJobResponse> {
    return videoDigitalTwin(this, req);
  }

  /** List available HeyGen avatars. */
  async videoAvatars(): Promise<AvatarsResponse> {
    return videoAvatars(this);
  }

  /** List available HeyGen templates. */
  async videoTemplates(): Promise<HeyGenTemplatesResponse> {
    return videoTemplates(this);
  }

  /** List available HeyGen voices. */
  async videoHeygenVoices(): Promise<HeyGenVoicesResponse> {
    return videoHeygenVoices(this);
  }

  /**
   * Inspect a HeyGen template's variable schema and scenes (unbilled).
   *
   * Only draft-v4 templates with variables are supported upstream; an
   * unknown template id surfaces as a provider_error.
   */
  async videoTemplateDetail(
    templateId: string,
  ): Promise<VideoTemplateDetailResponse> {
    return videoTemplateDetail(this, templateId);
  }

  /**
   * Render a video from a HeyGen template (async job type
   * "video/template-v3").
   *
   * Returns the accepted-job envelope — poll with {@link getJob} /
   * {@link pollJob} (or SSE via {@link streamJob}) until
   * "completed"/"failed", then read `result.video_url`.
   */
  async videoTemplateGenerate(
    templateId: string,
    req: VideoTemplateGenerateRequest,
  ): Promise<JobAcceptedResponse> {
    return videoTemplateGenerate(this, templateId, req);
  }

  /**
   * Submit 1–100 raw HeyGen video payloads as one batch (202 Accepted).
   * Poll {@link videoBatchStatus} for progress and delivery.
   */
  async videoBatchSubmit(
    req: VideoBatchSubmitRequest,
  ): Promise<VideoBatchSubmitResponse> {
    return videoBatchSubmit(this, req);
  }

  /**
   * Get a batch's status plus one cursor-paginated page of items.
   *
   * Poll (~5s) until `status` is terminal, then keep polling until
   * `billing_status == "settled"` — per-item `video_url` values are
   * withheld until settlement. Collect URLs across pages via `next_token`.
   */
  async videoBatchStatus(
    batchId: string,
    query?: VideoBatchStatusQuery,
  ): Promise<VideoBatchStatusResponse> {
    return videoBatchStatus(this, batchId, query);
  }

  // ── Avatar Realtime (HeyGen Broadcast) ────────────────────────────

  /**
   * Create a live avatar realtime session (HeyGen Broadcast).
   *
   * PREPAID: the entire `max_duration_seconds` block (1–3600 s) is charged
   * at create time; cancelling early does NOT refund.
   */
  async createAvatarRealtimeSession(
    req: AvatarRealtimeRequest,
  ): Promise<AvatarRealtimeCreateResponse> {
    return createAvatarRealtimeSession(this, req);
  }

  /**
   * Get the live status of an avatar realtime session.
   *
   * Poll (~2s) until `status == "streaming"`, then play `hls_url`.
   * "completed" and "error" are terminal.
   */
  async getAvatarRealtimeSession(
    streamId: string,
  ): Promise<AvatarRealtimeStatusResponse> {
    return getAvatarRealtimeSession(this, streamId);
  }

  /**
   * Append a text delta to a `text_stream` session (or close it with
   * `{ final: true }`).
   */
  async sendAvatarRealtimeText(
    streamId: string,
    req: AvatarRealtimeTextRequest,
  ): Promise<AvatarRealtimeTextResponse> {
    return sendAvatarRealtimeText(this, streamId, req);
  }

  /**
   * Terminate an avatar realtime session early (idempotent; no refund —
   * this only stops HeyGen's upstream meter).
   */
  async cancelAvatarRealtimeSession(
    streamId: string,
  ): Promise<AvatarRealtimeCancelResponse> {
    return cancelAvatarRealtimeSession(this, streamId);
  }

  // ── Embeddings ────────────────────────────────────────────────────

  /** Generate text embeddings for the given inputs. */
  async embed(req: EmbedRequest): Promise<EmbedResponse> {
    return embed(this, req);
  }

  // ── Documents ─────────────────────────────────────────────────────

  /** Extract text content from a document (PDF, image, etc.). */
  async extractDocument(req: DocumentRequest): Promise<DocumentResponse> {
    return extractDocument(this, req);
  }

  /** Chunk a document into smaller pieces for embedding or processing. */
  async chunkDocument(
    req: ChunkDocumentRequest,
  ): Promise<ChunkDocumentResponse> {
    return chunkDocument(this, req);
  }

  /** Process a document with extraction + optional instructions. */
  async processDocument(
    req: ProcessDocumentRequest,
  ): Promise<ProcessDocumentResponse> {
    return processDocument(this, req);
  }

  // ── RAG ───────────────────────────────────────────────────────────

  /** Search Vertex AI RAG corpora for relevant documentation. */
  async ragSearch(req: RAGSearchRequest): Promise<RAGSearchResponse> {
    return ragSearch(this, req);
  }

  /** List available Vertex AI RAG corpora. */
  async ragCorpora(): Promise<RAGCorpus[]> {
    return ragCorpora(this);
  }

  /** Search provider API documentation via SurrealDB vector search. */
  async surrealRagSearch(
    req: SurrealRAGSearchRequest,
  ): Promise<SurrealRAGSearchResponse> {
    return surrealRagSearch(this, req);
  }

  /** List available documentation providers in SurrealDB RAG. */
  async surrealRagProviders(): Promise<SurrealRAGProvidersResponse> {
    return surrealRagProviders(this);
  }

  // ── Search (Brave) ──────────────────────────────────────────────

  /** Perform a web search. Returns web results, news, videos, infobox, discussions. */
  async webSearch(req: WebSearchRequest): Promise<WebSearchResponse> {
    return webSearch(this, req);
  }

  /** Get LLM-optimized content chunks for grounding. */
  async searchContext(req: LLMContextRequest): Promise<LLMContextResponse> {
    return searchContext(this, req);
  }

  /** Get a grounded AI answer with citations. */
  async searchAnswer(req: SearchAnswerRequest): Promise<SearchAnswerResponse> {
    return searchAnswer(this, req);
  }

  // ── Models ────────────────────────────────────────────────────────

  /** List all available models with provider and pricing information. */
  async listModels(): Promise<ModelInfo[]> {
    return listModels(this);
  }

  /** Get the complete pricing table for all models. */
  async getPricing(): Promise<PricingInfo[]> {
    return getPricing(this);
  }

  // ── Account ───────────────────────────────────────────────────────

  /** Get the account credit balance. */
  async accountBalance(): Promise<BalanceResponse> {
    return accountBalance(this);
  }

  /** Get paginated usage history. */
  async accountUsage(query?: UsageQuery): Promise<UsageResponse> {
    return accountUsage(this, query);
  }

  /** Get monthly usage summary. */
  async accountUsageSummary(months?: number): Promise<UsageSummaryResponse> {
    return accountUsageSummary(this, months);
  }

  /** Get the full pricing table (model ID -> pricing entry map). */
  async accountPricing(): Promise<AccountPricingResponse> {
    return accountPricing(this);
  }

  // ── Jobs ──────────────────────────────────────────────────────────

  /** Create an async job. Returns the job ID for polling. */
  async createJob(req: JobCreateRequest): Promise<JobCreateResponse> {
    return createJob(this, req);
  }

  /** Check the status of an async job. */
  async getJob(jobId: string): Promise<JobStatusResponse> {
    return getJob(this, jobId);
  }

  /**
   * Poll a job until completion or timeout.
   *
   * @param jobId - Job ID to poll.
   * @param intervalMs - Polling interval in milliseconds (default 2000).
   * @param maxAttempts - Maximum poll attempts before timeout (default 150).
   */
  async pollJob(
    jobId: string,
    intervalMs?: number,
    maxAttempts?: number,
  ): Promise<JobStatusResponse> {
    return pollJob(this, jobId, intervalMs, maxAttempts);
  }

  /** List all jobs for the authenticated user. */
  async listJobs(): Promise<JobListResponse> {
    return listJobs(this);
  }

  /**
   * Submit a chat completion as an async job.
   * Use for long-running models (e.g. Opus) where sync chat may time out.
   * Params are the same shape as ChatRequest (model, messages, tools, etc.)
   */
  async chatJob(req: Omit<ChatRequest, "stream">): Promise<JobCreateResponse> {
    return chatJob(this, req);
  }

  /**
   * Stream job progress via SSE. Yields events as the job runs.
   * Events: progress (status update), complete (with result), error.
   */
  streamJob(jobId: string, signal?: AbortSignal): AsyncIterableIterator<JobStreamEvent> {
    return streamJob(this, jobId, signal);
  }

  /** Generate a 3D model via the async jobs system. */
  async generate3D(model: string, prompt?: string, imageUrl?: string): Promise<JobCreateResponse> {
    return generate3D(this, model, prompt, imageUrl);
  }

  /** Remesh a 3D model (re-topology + format conversion). Submits job and polls to completion. */
  async remesh(req: RemeshRequest): Promise<JobStatusResponse> {
    const job = await this.createJob({ type: "3d/remesh", params: req as unknown as Record<string, unknown> });
    return this.pollJob(job.job_id, 5000, 120);
  }

  /** Retexture a 3D model with AI-generated textures from text or image. */
  async retexture(req: RetextureRequest): Promise<JobStatusResponse> {
    const job = await this.createJob({ type: "3d/retexture", params: req as unknown as Record<string, unknown> });
    return this.pollJob(job.job_id, 5000, 120);
  }

  /** Rig a humanoid 3D model. Returns rigged character + basic walk/run animations. */
  async rig(req: RigRequest): Promise<JobStatusResponse> {
    const job = await this.createJob({ type: "3d/rig", params: req as unknown as Record<string, unknown> });
    return this.pollJob(job.job_id, 5000, 120);
  }

  /** Apply an animation to a rigged character. */
  async animate(req: AnimateRequest): Promise<JobStatusResponse> {
    const job = await this.createJob({ type: "3d/animate", params: req as unknown as Record<string, unknown> });
    return this.pollJob(job.job_id, 5000, 120);
  }

  // ── API Keys ──────────────────────────────────────────────────────

  /** Create a scoped API key. */
  async createKey(req: CreateKeyRequest): Promise<CreateKeyResponse> {
    return createKey(this, req);
  }

  /** List all API keys for the authenticated user. */
  async listKeys(): Promise<ListKeysResponse> {
    return listKeys(this);
  }

  /** Revoke an API key. */
  async revokeKey(id: string): Promise<StatusResponse> {
    return revokeKey(this, id);
  }

  // ── Compute ───────────────────────────────────────────────────────

  /** Get available compute templates with pricing. */
  async computeTemplates(): Promise<TemplatesResponse> {
    return computeTemplates(this);
  }

  /** Provision a new GPU compute instance. */
  async computeProvision(req: ProvisionRequest): Promise<ProvisionResponse> {
    return computeProvision(this, req);
  }

  /** List all compute instances for the authenticated user. */
  async computeInstances(): Promise<InstancesResponse> {
    return computeInstances(this);
  }

  /** Get full status of a single compute instance. */
  async computeInstance(id: string): Promise<InstanceResponse> {
    return computeInstance(this, id);
  }

  /** Tear down a compute instance and finalize billing. */
  async computeDelete(id: string): Promise<DeleteResponse> {
    return computeDelete(this, id);
  }

  /** Inject an SSH public key into a running instance. */
  async computeSSHKey(
    id: string,
    req: SSHKeyRequest,
  ): Promise<StatusResponse> {
    return computeSSHKey(this, id, req);
  }

  /** Reset the inactivity timer on a compute instance. */
  async computeKeepalive(id: string): Promise<StatusResponse> {
    return computeKeepalive(this, id);
  }

  /** Query compute billing from BigQuery. */
  async computeBilling(req: BillingRequest): Promise<BillingResponse> {
    const { data } = await this._doJSON<BillingResponse>("POST", "/qai/v1/compute/billing", req);
    return data;
  }

  // ── Voice Management ──────────────────────────────────────────────

  /** List all available voices (ElevenLabs). */
  async listVoices(): Promise<VoicesResponse> {
    return listVoices(this);
  }

  /** Create an instant voice clone from audio samples (ElevenLabs). */
  async cloneVoice(req: CloneVoiceRequest): Promise<CloneVoiceResponse> {
    return cloneVoice(this, req);
  }

  /** Delete a cloned voice (ElevenLabs). */
  async deleteVoice(id: string): Promise<StatusResponse> {
    return deleteVoice(this, id);
  }

  // ── Realtime Voice ────────────────────────────────────────────────

  /**
   * Open a realtime voice session via WebSocket (proxy path).
   * Returns [sender, receiver] for bidirectional audio communication.
   */
  async realtimeConnect(
    config?: RealtimeConfig,
  ): Promise<[RealtimeSender, RealtimeReceiver]> {
    return realtimeConnect(this, config);
  }

  /** Request an ephemeral token for direct xAI voice connection (lower latency). */
  async realtimeSession(): Promise<RealtimeSession> {
    return realtimeSession(this);
  }

  /**
   * Request a realtime session with full configuration.
   * Pass voice, prompt, tools, etc. for ElevenLabs ConvAI.
   */
  async realtimeSessionWith(body: Record<string, unknown>): Promise<RealtimeSession> {
    const { data } = await this._doJSON<RealtimeSession>("POST", "/qai/v1/realtime/session", body);
    return data;
  }

  /** End a realtime session and finalize billing. */
  async realtimeEnd(sessionId: string, durationSeconds: number): Promise<void> {
    return realtimeEnd(this, sessionId, durationSeconds);
  }

  /** Refresh an ephemeral token for long sessions (>4 min). */
  async realtimeRefresh(sessionId: string): Promise<string> {
    return realtimeRefresh(this, sessionId);
  }

  // ── Batch Processing ──────────────────────────────────────────────

  /** Submit a batch of jobs for processing. */
  async batchSubmit(req: BatchSubmitRequest): Promise<BatchSubmitResponse> {
    return batchSubmit(this, req);
  }

  /** Submit a batch of jobs using JSONL format. */
  async batchSubmitJsonl(jsonl: string): Promise<BatchJsonlResponse> {
    return batchSubmitJsonl(this, jsonl);
  }

  /** List all batch jobs for the account. */
  async batchJobs(): Promise<BatchJobsResponse> {
    return batchJobs(this);
  }

  /** Get the status and result of a single batch job. */
  async batchJob(id: string): Promise<BatchJobInfo> {
    return batchJob(this, id);
  }

  // ── Credits ───────────────────────────────────────────────────────

  /** List available credit packs (no auth required). */
  async creditPacks(): Promise<CreditPacksResponse> {
    return creditPacks(this);
  }

  /** Purchase a credit pack. Returns a checkout URL for payment. */
  async creditPurchase(req: CreditPurchaseRequest): Promise<CreditPurchaseResponse> {
    return creditPurchase(this, req);
  }

  /** Get the current credit balance. */
  async creditBalance(): Promise<CreditBalanceResponse> {
    return creditBalance(this);
  }

  /** List available credit tiers (no auth required). */
  async creditTiers(): Promise<CreditTiersResponse> {
    return creditTiers(this);
  }

  /** Apply for the developer program. */
  async devProgramApply(req: DevProgramApplyRequest): Promise<DevProgramApplyResponse> {
    return devProgramApply(this, req);
  }

  // ── Auth ──────────────────────────────────────────────────────────

  /** Authenticate with Apple Sign-In. */
  async authApple(req: AuthAppleRequest): Promise<AuthResponse> {
    return authApple(this, req);
  }

  // ── Internal HTTP helpers ─────────────────────────────────────────

  /**
   * Generate a v4 UUID. Prefers crypto.randomUUID(); falls back to a
   * RFC4122-v4-shaped string when the runtime lacks it (older Node).
   * @internal
   */
  private _uuid(): string {
    const c =
      (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
    // Best-effort fallback — not cryptographically strong, but unique enough
    // for an idempotency key on a single client.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      const v = ch === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Combine an internal timeout signal with an optional caller signal.
   * Returns the caller signal unchanged when no timeout is in play.
   * @internal
   */
  private _combinedSignal(
    timeoutMs: number | undefined,
    callerSignal?: AbortSignal,
  ): AbortSignal | undefined {
    const timeoutSig =
      timeoutMs !== undefined &&
      typeof AbortSignal !== "undefined" &&
      typeof (AbortSignal as { timeout?: unknown }).timeout === "function"
        ? AbortSignal.timeout(timeoutMs)
        : undefined;

    if (timeoutSig && callerSignal) {
      // AbortSignal.any is available in Node 20+ and modern browsers.
      const anyFn = (AbortSignal as { any?: (s: AbortSignal[]) => AbortSignal })
        .any;
      if (typeof anyFn === "function") return anyFn([timeoutSig, callerSignal]);
      // Fallback: chain caller abort into the timeout controller.
      if (callerSignal.aborted) return callerSignal;
      const ctrl = new AbortController();
      callerSignal.addEventListener("abort", () => ctrl.abort(), {
        once: true,
      });
      timeoutSig.addEventListener("abort", () => ctrl.abort(), { once: true });
      return ctrl.signal;
    }
    return timeoutSig ?? callerSignal;
  }

  /** Options for {@link QuantumClient._doJSON}. */
  // DoJSONOptions is declared as a top-level interface above the class.

  /**
   * Send a JSON request and decode the JSON response.
   *
   * Sets an auto-generated `Idempotency-Key` header on every non-GET request
   * (override with {@link DoJSONOptions.idempotencyKey}); the same key is
   * reused across the 5xx/network retry loop so the gateway dedupes a flaked
   * retry instead of double-billing. 4xx errors are never retried.
   *
   * Parses `X-QAI-Balance-After` (wallet balance after this request, in
   * ticks) and `X-Semantic-Cache` ("hit" → cached=true) into the returned
   * {@link ResponseMeta}.
   *
   * @internal
   */
  async _doJSON<T>(
    method: string,
    path: string,
    body: unknown,
    opts?: DoJSONOptions,
  ): Promise<{ data: T; meta: ResponseMeta }> {
    const isMutation = method !== "GET" && method !== "HEAD";
    const idempotencyKey =
      isMutation && this.idempotencyEnabled
        ? (opts?.idempotencyKey ?? this._uuid())
        : opts?.idempotencyKey;

    const maxRetries = opts?.retries ?? 2;
    let attempt = 0;
    // Don't time out streaming callers — only buffered calls use the timeout.
    const signal = this._combinedSignal(this.timeoutMs, opts?.signal);

    let lastErr: unknown;
    while (attempt <= maxRetries) {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
      };
      if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

      const init: RequestInit = { method, headers, signal };
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }

      let response: Response;
      try {
        response = await this._fetch(`${this.baseUrl}${path}`, init);
      } catch (err) {
        // Network flake / abort — retry unless the caller aborted.
        if (signal?.aborted) throw err;
        lastErr = err;
        attempt++;
        if (attempt > maxRetries) throw err;
        // Brief backoff before retry (50ms, 100ms, …).
        await new Promise((r) => setTimeout(r, 50 * 2 ** (attempt - 1)));
        continue;
      }

      const meta: ResponseMeta = {
        requestId: response.headers.get("X-QAI-Request-Id") ?? "",
        model: response.headers.get("X-QAI-Model") ?? "",
        costTicks: 0,
      };

      const costHeader = response.headers.get("X-QAI-Cost-Ticks");
      if (costHeader) {
        meta.costTicks = parseInt(costHeader, 10) || 0;
      }
      const balanceHeader = response.headers.get("X-QAI-Balance-After");
      if (balanceHeader) {
        const n = Number(balanceHeader);
        if (Number.isFinite(n)) meta.balanceAfter = n;
      }
      const cacheHeader = response.headers.get("X-Semantic-Cache");
      if (cacheHeader && cacheHeader.toLowerCase() === "hit") {
        meta.cached = true;
      }

      if (!response.ok) {
        // Retry only 5xx (and only when not caller-aborted). Never 4xx.
        if (response.status >= 500 && !signal?.aborted && attempt < maxRetries) {
          lastErr = await parseAPIError(response, meta.requestId);
          attempt++;
          await new Promise((r) => setTimeout(r, 50 * 2 ** (attempt - 1)));
          continue;
        }
        throw await parseAPIError(response, meta.requestId);
      }

      const data = (await response.json()) as T;
      return { data, meta };
    }

    // Exhausted retries on network errors.
    throw lastErr instanceof Error
      ? lastErr
      : new Error("qai: request failed after retries");
  }

  /**
   * Send a JSON request expecting an SSE (text/event-stream) response.
   * Returns the raw Response for the caller to read SSE events from.
   * Streaming requests are NOT timed out by the client (the server keeps
   * the connection open for the whole generation); the caller's `signal`
   * is forwarded so a caller abort still cancels the upstream fetch.
   * @internal
   */
  async _doStreamRaw(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    // Idempotency-Key on the streaming POST too — harmless on /missions
    // (no billing side-effect dedup needed) and useful if a caller retries
    // a dropped connection.
    if (this.idempotencyEnabled) {
      headers["Idempotency-Key"] = this._uuid();
    }

    const response = await this._fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const requestId = response.headers.get("X-QAI-Request-Id") ?? "";
      throw await parseAPIError(response, requestId);
    }

    return response;
  }
}
