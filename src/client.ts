import { parseAPIError } from "./errors.js";
import { chat, chatStream } from "./chat.js";
import { generateImage, editImage } from "./image.js";
import { speak, transcribe, generateMusic } from "./audio.js";
import { generateVideo } from "./video.js";
import { embed } from "./embeddings.js";
import { extractDocument } from "./documents.js";
import { ragSearch, ragCorpora, surrealRagSearch } from "./rag.js";
import { listModels, getPricing } from "./models.js";
import type {
  ChatRequest,
  ChatResponse,
  ClientOptions,
  DocumentRequest,
  DocumentResponse,
  EmbedRequest,
  EmbedResponse,
  ImageEditRequest,
  ImageEditResponse,
  ImageRequest,
  ImageResponse,
  ModelInfo,
  MusicRequest,
  MusicResponse,
  PricingInfo,
  RAGCorpus,
  RAGSearchRequest,
  RAGSearchResponse,
  ResponseMeta,
  STTRequest,
  STTResponse,
  StreamEvent,
  SurrealRAGSearchRequest,
  SurrealRAGSearchResponse,
  TTSRequest,
  TTSResponse,
  VideoRequest,
  VideoResponse,
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

  /** Generate music from a text prompt. */
  async generateMusic(req: MusicRequest): Promise<MusicResponse> {
    return generateMusic(this, req);
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

  // ── Models ────────────────────────────────────────────────────────

  /** List all available models with provider and pricing information. */
  async listModels(): Promise<ModelInfo[]> {
    return listModels(this);
  }

  /** Get the complete pricing table for all models. */
  async getPricing(): Promise<PricingInfo[]> {
    return getPricing(this);
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
