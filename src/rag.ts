import type { QuantumClient } from "./client.js";
import type {
  RAGCorporaResponseBody,
  RAGCorpus,
  RAGSearchRequest,
  RAGSearchResponse,
  SurrealRAGProvidersResponse,
  SurrealRAGSearchRequest,
  SurrealRAGSearchResponse,
  Collection,
  CollectionDocument,
  CollectionSearchRequest,
  CollectionSearchResult,
  CollectionUploadResult,
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

// ── RAG Collections (user-scoped xAI proxy) ─────────────────────

export async function collectionsList(client: QuantumClient): Promise<Collection[]> {
  const { data } = await client._doJSON<{ collections: Collection[] }>("GET", "/qai/v1/rag/collections", undefined);
  return data.collections;
}

export async function collectionsCreate(client: QuantumClient, name: string): Promise<Collection> {
  const { data } = await client._doJSON<Collection>("POST", "/qai/v1/rag/collections", { name });
  return data;
}

export async function collectionsGet(client: QuantumClient, id: string): Promise<Collection> {
  const { data } = await client._doJSON<Collection>("GET", `/qai/v1/rag/collections/${id}`, undefined);
  return data;
}

export async function collectionsDelete(client: QuantumClient, id: string): Promise<void> {
  await client._doJSON("DELETE", `/qai/v1/rag/collections/${id}`, undefined);
}

export async function collectionsDocuments(client: QuantumClient, collectionId: string): Promise<CollectionDocument[]> {
  const { data } = await client._doJSON<{ documents: CollectionDocument[] }>("GET", `/qai/v1/rag/collections/${collectionId}/documents`, undefined);
  return data.documents;
}

export async function collectionsSearch(client: QuantumClient, req: CollectionSearchRequest): Promise<CollectionSearchResult[]> {
  const { data } = await client._doJSON<{ results: CollectionSearchResult[] }>("POST", "/qai/v1/rag/collections/search", req);
  return data.results;
}
