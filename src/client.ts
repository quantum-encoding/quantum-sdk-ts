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
} from "./video.js";
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
import { createJob, getJob, pollJob, listJobs } from "./jobs.js";
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
  AgentRequest,
  AlignRequest,
  AlignResponse,
  AsyncJobResponse,
  AuthAppleRequest,
  AuthResponse,
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
  VideoRequest,
  VideoResponse,
  VideoStudioRequest,
  VideoTranslateRequest,
  VoiceDesignRequest,
  VoiceDesignResponse,
  VoicesResponse,
} from "./types.js";
import { DEFAULT_BASE_URL } from "./types.js";

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

  constructor(apiKey: string, options?: ClientOptions) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
    this._fetch = options?.fetch ?? globalThis.fetch.bind(globalThis);
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
   * Send a JSON request and decode the JSON response.
   * @internal
   */
  async _doJSON<T>(
    method: string,
    path: string,
    body: unknown,
  ): Promise<{ data: T; meta: ResponseMeta }> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    const init: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const response = await this._fetch(`${this.baseUrl}${path}`, init);

    const meta: ResponseMeta = {
      requestId: response.headers.get("X-QAI-Request-Id") ?? "",
      model: response.headers.get("X-QAI-Model") ?? "",
      costTicks: 0,
    };

    const costHeader = response.headers.get("X-QAI-Cost-Ticks");
    if (costHeader) {
      meta.costTicks = parseInt(costHeader, 10) || 0;
    }

    if (!response.ok) {
      throw await parseAPIError(response, meta.requestId);
    }

    const data = (await response.json()) as T;
    return { data, meta };
  }

  /**
   * Send a JSON request expecting an SSE (text/event-stream) response.
   * Returns the raw Response for the caller to read SSE events from.
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
