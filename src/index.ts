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
  // Video
  VideoRequest,
  VideoResponse,
  GeneratedVideo,
  // Embeddings
  EmbedRequest,
  EmbedResponse,
  // Documents
  DocumentRequest,
  DocumentResponse,
  // RAG
  RAGSearchRequest,
  RAGSearchResponse,
  RAGResult,
  RAGCorpus,
  SurrealRAGSearchRequest,
  SurrealRAGSearchResponse,
  SurrealRAGResult,
  // Models
  ModelInfo,
  PricingInfo,
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
