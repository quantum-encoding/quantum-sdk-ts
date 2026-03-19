import type { QuantumClient } from "./client.js";
import type {
  RAGCorporaResponseBody,
  RAGCorpus,
  RAGSearchRequest,
  RAGSearchResponse,
  SurrealRAGProvidersResponse,
  SurrealRAGSearchRequest,
  SurrealRAGSearchResponse,
} from "./types.js";

/**
 * Search Vertex AI RAG corpora for relevant documentation.
 * @internal — called by QuantumClient.ragSearch()
 */
export async function ragSearch(
  client: QuantumClient,
  req: RAGSearchRequest,
): Promise<RAGSearchResponse> {
  const { data, meta } = await client._doJSON<RAGSearchResponse>(
    "POST",
    "/qai/v1/rag/search",
    req,
  );

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * List available Vertex AI RAG corpora.
 * @internal — called by QuantumClient.ragCorpora()
 */
export async function ragCorpora(
  client: QuantumClient,
): Promise<RAGCorpus[]> {
  const { data } = await client._doJSON<RAGCorporaResponseBody>(
    "GET",
    "/qai/v1/rag/corpora",
    undefined,
  );

  return data.corpora;
}

/**
 * Search provider API documentation via SurrealDB vector search.
 * @internal — called by QuantumClient.surrealRagSearch()
 */
export async function surrealRagSearch(
  client: QuantumClient,
  req: SurrealRAGSearchRequest,
): Promise<SurrealRAGSearchResponse> {
  const { data, meta } = await client._doJSON<SurrealRAGSearchResponse>(
    "POST",
    "/qai/v1/rag/surreal/search",
    req,
  );

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * List available documentation providers in SurrealDB RAG.
 * @internal — called by QuantumClient.surrealRagProviders()
 */
export async function surrealRagProviders(
  client: QuantumClient,
): Promise<SurrealRAGProvidersResponse> {
  const { data } = await client._doJSON<SurrealRAGProvidersResponse>(
    "GET",
    "/qai/v1/rag/surreal/providers",
    undefined,
  );

  return data;
}
