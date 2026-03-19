// ── Client ──────────────────────────────────────────────────────────
export { QuantumClient } from "./client.js";

// ── Errors ──────────────────────────────────────────────────────────
export {
  APIError,
  isRateLimitError,
  isAuthError,
  isNotFoundError,
} from "./errors.js";

// ── Chat helpers ────────────────────────────────────────────────────
export { responseText, responseThinking, responseToolCalls } from "./chat.js";

// ── Contact (standalone, no auth required) ──────────────────────────
export { contact } from "./contact.js";

// ── Types ───────────────────────────────────────────────────────────
export type {
  ClientOptions,
  ResponseMeta,
  // Chat
  ChatRequest,
  ChatMessage,
  ChatTool,
  ContentBlock,
  ChatUsage,
  ChatResponse,
  StreamEvent,
  StreamDelta,
  StreamToolUse,
  // Session Chat
  SessionChatRequest,
  SessionChatResponse,
  SessionToolResult,
  ContextConfig,
  ContextMetadata,
  // Agent
  AgentRequest,
  AgentWorkerConfig,
  AgentEvent,
  // Missions
  MissionRequest,
  MissionWorkerConfig,
  MissionEvent,
  // Image
  ImageRequest,
  ImageResponse,
  GeneratedImage,
  ImageEditRequest,
  ImageEditResponse,
  // Audio
  TTSRequest,
  TTSResponse,
  STTRequest,
  STTResponse,
  MusicRequest,
  MusicClip,
  MusicResponse,
  SoundEffectRequest,
  SoundEffectResponse,
  // Advanced Audio
  DialogueRequest,
  DialogueResponse,
  DialogueVoice,
  SpeechToSpeechRequest,
  SpeechToSpeechResponse,
  IsolateVoiceRequest,
  IsolateVoiceResponse,
  RemixVoiceRequest,
  RemixVoiceResponse,
  DubRequest,
  DubResponse,
  AlignRequest,
  AlignResponse,
  AlignedWord,
  VoiceDesignRequest,
  VoiceDesignResponse,
  VoicePreview,
  StarfishTTSRequest,
  StarfishTTSResponse,
  // Video
  VideoRequest,
  VideoResponse,
  GeneratedVideo,
  // HeyGen Video
  VideoStudioRequest,
  VideoTranslateRequest,
  PhotoAvatarRequest,
  DigitalTwinRequest,
  AsyncJobResponse,
  AvatarsResponse,
  HeyGenAvatar,
  HeyGenTemplatesResponse,
  HeyGenTemplate,
  HeyGenVoicesResponse,
  HeyGenVoice,
  // Embeddings
  EmbedRequest,
  EmbedResponse,
  // Documents
  DocumentRequest,
  DocumentResponse,
  ChunkDocumentRequest,
  ChunkDocumentResponse,
  DocumentChunk,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  // RAG
  RAGSearchRequest,
  RAGSearchResponse,
  RAGResult,
  RAGCorpus,
  SurrealRAGSearchRequest,
  SurrealRAGSearchResponse,
  SurrealRAGResult,
  SurrealRAGProvidersResponse,
  SurrealRAGProviderInfo,
  // Models
  ModelInfo,
  PricingInfo,
  // Account
  BalanceResponse,
  UsageEntry,
  UsageResponse,
  UsageQuery,
  UsageSummaryMonth,
  UsageSummaryResponse,
  PricingEntry,
  AccountPricingResponse,
  // Jobs
  JobCreateRequest,
  JobCreateResponse,
  JobStatusResponse,
  JobListResponse,
  JobListItem,
  // API Keys
  CreateKeyRequest,
  CreateKeyResponse,
  KeyDetails,
  ListKeysResponse,
  // Compute
  ComputeTemplate,
  TemplatesResponse,
  ProvisionRequest,
  ProvisionResponse,
  ComputeInstanceInfo,
  InstancesResponse,
  InstanceDetailInfo,
  InstanceResponse,
  SSHKeyRequest,
  DeleteResponse,
  // Voice Management
  VoiceInfo,
  VoicesResponse,
  CloneVoiceRequest,
  CloneVoiceResponse,
  // Contact
  ContactRequest,
  // Common
  StatusResponse,
} from "./types.js";

// ── Constants ───────────────────────────────────────────────────────
export { DEFAULT_BASE_URL, TICKS_PER_USD } from "./types.js";

// ── Convenience message builders ────────────────────────────────────
import type { ChatMessage } from "./types.js";

/** Create a user message. */
export function userMessage(content: string): ChatMessage {
  return { role: "user", content };
}

/** Create an assistant message. */
export function assistantMessage(content: string): ChatMessage {
  return { role: "assistant", content };
}

/** Create a system message. */
export function systemMessage(content: string): ChatMessage {
  return { role: "system", content };
}

/** Create a tool result message. */
export function toolMessage(
  toolCallId: string,
  content: string,
  isError?: boolean,
): ChatMessage {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    content,
    is_error: isError,
  };
}
