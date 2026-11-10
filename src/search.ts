import type { QuantumClient } from "./client.js";
import type {
  WebSearchRequest,
  WebSearchResponse,
  LLMContextRequest,
  LLMContextResponse,
} from "./types.js";

/**
 * Perform a Brave web search.
 * @internal
 */
export async function webSearch(
  client: QuantumClient,
  req: WebSearchRequest,
): Promise<WebSearchResponse> {
  const { data } = await client._doJSON<WebSearchResponse>(
    "POST",
    "/qai/v1/search/web",
    req,
  );
  return data;
}

/**
 * Get LLM-optimized content chunks for a query.
 * @internal
 */
export async function searchContext(
  client: QuantumClient,
  req: LLMContextRequest,
): Promise<LLMContextResponse> {
  const { data } = await client._doJSON<LLMContextResponse>(
    "POST",
    "/qai/v1/search/context",
    req,
  );
  return data;
}
