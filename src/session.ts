import type { QuantumClient } from "./client.js";
import type {
  SessionChatRequest,
  SessionChatResponse,
} from "./types.js";

/**
 * Send a session-based chat request. The server manages conversation history.
 * @internal — called by QuantumClient.chatSession()
 */
export async function chatSession(
  client: QuantumClient,
  req: SessionChatRequest,
): Promise<SessionChatResponse> {
  const body: SessionChatRequest = { ...req, stream: false };

  const { data, meta } = await client._doJSON<SessionChatResponse>(
    "POST",
    "/qai/v1/chat/session",
    body,
  );

  if (data.response) {
    if (!data.response.cost_ticks) {
      data.response.cost_ticks = meta.costTicks;
    }
    if (!data.response.request_id) {
      data.response.request_id = meta.requestId;
    }
  }

  return data;
}
