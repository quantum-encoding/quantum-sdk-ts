import type { QuantumClient } from "./client.js";
import type { VideoRequest, VideoResponse } from "./types.js";

/**
 * Generate a video from a text prompt.
 *
 * Video generation is slow (30s-5min). For production use, consider submitting
 * via the Jobs API instead.
 *
 * @internal — called by QuantumClient.generateVideo()
 */
export async function generateVideo(
  client: QuantumClient,
  req: VideoRequest,
): Promise<VideoResponse> {
  const { data, meta } = await client._doJSON<VideoResponse>(
    "POST",
    "/qai/v1/video/generate",
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
