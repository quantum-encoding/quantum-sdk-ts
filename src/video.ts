import type { QuantumClient } from "./client.js";
import type {
  AsyncJobResponse,
  AvatarsResponse,
  DigitalTwinRequest,
  HeyGenTemplatesResponse,
  HeyGenVoicesResponse,
  JobAcceptedResponse,
  PhotoAvatarRequest,
  VideoBatchStatusQuery,
  VideoBatchStatusResponse,
  VideoBatchSubmitRequest,
  VideoBatchSubmitResponse,
  VideoRequest,
  VideoResponse,
  VideoStudioRequest,
  VideoTemplateDetailResponse,
  VideoTemplateGenerateRequest,
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

/**
 * Inspect a HeyGen template's variable schema and scenes (unbilled).
 *
 * Only draft-v4 templates with variables are supported upstream; an unknown
 * template id surfaces as a provider_error.
 *
 * @internal — called by QuantumClient.videoTemplateDetail()
 */
export async function videoTemplateDetail(
  client: QuantumClient,
  templateId: string,
): Promise<VideoTemplateDetailResponse> {
  const { data } = await client._doJSON<VideoTemplateDetailResponse>(
    "GET",
    `/qai/v1/video/template/${encodeURIComponent(templateId)}`,
    undefined,
  );

  return data;
}

/**
 * Render a video from a HeyGen template (async job type "video/template-v3").
 *
 * Returns the accepted-job envelope — poll with getJob()/pollJob() (or SSE
 * via streamJob()) until "completed"/"failed", then read result.video_url.
 * Deep validation happens at execution time, so violations surface as a
 * failed job rather than a 4xx at submit.
 *
 * @internal — called by QuantumClient.videoTemplateGenerate()
 */
export async function videoTemplateGenerate(
  client: QuantumClient,
  templateId: string,
  req: VideoTemplateGenerateRequest,
): Promise<JobAcceptedResponse> {
  const { data } = await client._doJSON<JobAcceptedResponse>(
    "POST",
    `/qai/v1/video/template/${encodeURIComponent(templateId)}`,
    req,
  );

  return data;
}

/**
 * Submit 1–100 raw HeyGen video payloads as one batch (202 Accepted).
 *
 * Poll videoBatchStatus() for progress and delivery.
 *
 * @internal — called by QuantumClient.videoBatchSubmit()
 */
export async function videoBatchSubmit(
  client: QuantumClient,
  req: VideoBatchSubmitRequest,
): Promise<VideoBatchSubmitResponse> {
  const { data } = await client._doJSON<VideoBatchSubmitResponse>(
    "POST",
    "/qai/v1/video/batch",
    req,
  );

  return data;
}

/**
 * Get a batch's status plus one cursor-paginated page of items.
 *
 * Poll (~5s) until `status` is terminal, then keep polling until
 * `billing_status == "settled"` — per-item `video_url` values are withheld
 * until settlement. Collect URLs across pages via `next_token`.
 *
 * @internal — called by QuantumClient.videoBatchStatus()
 */
export async function videoBatchStatus(
  client: QuantumClient,
  batchId: string,
  query?: VideoBatchStatusQuery,
): Promise<VideoBatchStatusResponse> {
  const params = new URLSearchParams();
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.token !== undefined && query.token !== "") {
    params.set("token", query.token);
  }

  const qs = params.toString();
  const base = `/qai/v1/video/batch/${encodeURIComponent(batchId)}`;
  const path = qs ? `${base}?${qs}` : base;

  const { data } = await client._doJSON<VideoBatchStatusResponse>(
    "GET",
    path,
    undefined,
  );

  return data;
}
