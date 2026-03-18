import type { QuantumClient } from "./client.js";
import type { DocumentRequest, DocumentResponse } from "./types.js";

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
