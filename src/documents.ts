import type { QuantumClient } from "./client.js";
import type {
  ChunkDocumentRequest,
  ChunkDocumentResponse,
  DocumentRequest,
  DocumentResponse,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
} from "./types.js";

/**
 * Extract text content from a document (PDF, image, etc.).
 * @internal — called by QuantumClient.extractDocument()
 */
export async function extractDocument(
  client: QuantumClient,
  req: DocumentRequest,
): Promise<DocumentResponse> {
  const { data, meta } = await client._doJSON<DocumentResponse>(
    "POST",
    "/qai/v1/documents/extract",
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
 * Chunk a document into smaller pieces for embedding or processing.
 * @internal — called by QuantumClient.chunkDocument()
 */
export async function chunkDocument(
  client: QuantumClient,
  req: ChunkDocumentRequest,
): Promise<ChunkDocumentResponse> {
  const { data, meta } = await client._doJSON<ChunkDocumentResponse>(
    "POST",
    "/qai/v1/documents/chunk",
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
 * Process a document with extraction + optional instructions.
 * @internal — called by QuantumClient.processDocument()
 */
export async function processDocument(
  client: QuantumClient,
  req: ProcessDocumentRequest,
): Promise<ProcessDocumentResponse> {
  const { data, meta } = await client._doJSON<ProcessDocumentResponse>(
    "POST",
    "/qai/v1/documents/process",
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
