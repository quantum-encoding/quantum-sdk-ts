import type { QuantumClient } from "./client.js";
import type {
  AsyncJobResponse,
  AvatarsResponse,
  DigitalTwinRequest,
  HeyGenTemplatesResponse,
  HeyGenVoicesResponse,
  PhotoAvatarRequest,
  VideoRequest,
  VideoResponse,
  VideoStudioRequest,
  VideoTranslateRequest,
} from "./types.js";

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

/**
 * Create a talking-head video via HeyGen Studio. Returns an async job.
 * @internal — called by QuantumClient.videoStudio()
 */
export async function videoStudio(
  client: QuantumClient,
  req: VideoStudioRequest,
): Promise<AsyncJobResponse> {
  const { data } = await client._doJSON<AsyncJobResponse>(
    "POST",
    "/qai/v1/video/studio",
    req,
  );

  return data;
}

/**
 * Submit a video translation job via HeyGen. Returns an async job.
 * @internal — called by QuantumClient.videoTranslate()
 */
export async function videoTranslate(
  client: QuantumClient,
  req: VideoTranslateRequest,
): Promise<AsyncJobResponse> {
  const { data } = await client._doJSON<AsyncJobResponse>(
    "POST",
    "/qai/v1/video/translate",
    req,
  );

  return data;
}

/**
 * Create a photo avatar via HeyGen. Returns an async job.
 * @internal — called by QuantumClient.videoPhotoAvatar()
 */
export async function videoPhotoAvatar(
  client: QuantumClient,
  req: PhotoAvatarRequest,
): Promise<AsyncJobResponse> {
  const { data } = await client._doJSON<AsyncJobResponse>(
    "POST",
    "/qai/v1/video/photo-avatar",
    req,
  );

  return data;
}

/**
 * Create a digital twin via HeyGen. Returns an async job.
 * @internal — called by QuantumClient.videoDigitalTwin()
 */
export async function videoDigitalTwin(
  client: QuantumClient,
  req: DigitalTwinRequest,
): Promise<AsyncJobResponse> {
  const { data } = await client._doJSON<AsyncJobResponse>(
    "POST",
    "/qai/v1/video/digital-twin",
    req,
  );

  return data;
}

/**
 * List available HeyGen avatars.
 * @internal — called by QuantumClient.videoAvatars()
 */
export async function videoAvatars(
  client: QuantumClient,
): Promise<AvatarsResponse> {
  const { data } = await client._doJSON<AvatarsResponse>(
    "GET",
    "/qai/v1/video/avatars",
    undefined,
  );

  return data;
}

/**
 * List available HeyGen templates.
 * @internal — called by QuantumClient.videoTemplates()
 */
export async function videoTemplates(
  client: QuantumClient,
): Promise<HeyGenTemplatesResponse> {
  const { data } = await client._doJSON<HeyGenTemplatesResponse>(
    "GET",
    "/qai/v1/video/templates",
    undefined,
  );

  return data;
}

/**
 * List available HeyGen voices.
 * @internal — called by QuantumClient.videoHeygenVoices()
 */
export async function videoHeygenVoices(
  client: QuantumClient,
): Promise<HeyGenVoicesResponse> {
  const { data } = await client._doJSON<HeyGenVoicesResponse>(
    "GET",
    "/qai/v1/video/heygen-voices",
    undefined,
  );

  return data;
}
