import type { QuantumClient } from "./client.js";
import type {
  ImageEditRequest,
  ImageEditResponse,
  ImageRequest,
  ImageResponse,
} from "./types.js";

/**
 * Generate images from a text prompt.
 * @internal — called by QuantumClient.generateImage()
 */
export async function generateImage(
  client: QuantumClient,
  req: ImageRequest,
): Promise<ImageResponse> {
  const { data, meta } = await client._doJSON<ImageResponse>(
    "POST",
    "/qai/v1/images/generate",
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
 * Edit images using an AI model.
 * @internal — called by QuantumClient.editImage()
 */
export async function editImage(
  client: QuantumClient,
  req: ImageEditRequest,
): Promise<ImageEditResponse> {
  const { data, meta } = await client._doJSON<ImageEditResponse>(
    "POST",
    "/qai/v1/images/edit",
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
