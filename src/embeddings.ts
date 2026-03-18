import type { QuantumClient } from "./client.js";
import type { EmbedRequest, EmbedResponse } from "./types.js";

/**
 * Generate text embeddings for the given inputs.
 * @internal — called by QuantumClient.embed()
 */
export async function embed(
  client: QuantumClient,
  req: EmbedRequest,
): Promise<EmbedResponse> {
  const { data, meta } = await client._doJSON<EmbedResponse>(
    "POST",
    "/qai/v1/embeddings",
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
