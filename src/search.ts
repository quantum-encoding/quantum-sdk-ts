import type { QuantumClient } from "./client.js";
import type {
  WebSearchRequest,
  WebSearchResponse,
  LLMContextRequest,
  LLMContextResponse,
  SearchAnswerRequest,
  SearchAnswerResponse,
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

/**
 * Get a grounded AI answer with citations.
 * @internal
 */
export async function searchAnswer(
  client: QuantumClient,
  req: SearchAnswerRequest,
): Promise<SearchAnswerResponse> {
  const { data } = await client._doJSON<SearchAnswerResponse>(
    "POST",
    "/qai/v1/search/answer",
    req,
  );
  return data;
}
