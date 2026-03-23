import type { QuantumClient } from "./client.js";
import type {
  ChatRequest,
  JobCreateRequest,
  JobCreateResponse,
  JobListResponse,
  JobStatusResponse,
  JobStreamEvent,
} from "./types.js";

/**
 * Create an async job. Returns the job ID for polling.
 * @internal
 */
export async function createJob(
  client: QuantumClient,
  req: JobCreateRequest,
): Promise<JobCreateResponse> {
  const { data } = await client._doJSON<JobCreateResponse>(
    "POST",
    "/qai/v1/jobs",
    req,
  );

  return data;
}

/**
 * Check the status of an async job.
 * @internal
 */
export async function getJob(
  client: QuantumClient,
  jobId: string,
): Promise<JobStatusResponse> {
  const { data } = await client._doJSON<JobStatusResponse>(
    "GET",
    `/qai/v1/jobs/${jobId}`,
    undefined,
  );

  return data;
}

/**
 * Poll a job until completion or timeout.
 * @internal
 */
export async function pollJob(
  client: QuantumClient,
  jobId: string,
  intervalMs = 2000,
  maxAttempts = 150,
): Promise<JobStatusResponse> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const status = await getJob(client, jobId);
    if (status.status === "completed" || status.status === "failed") {
      return status;
    }
  }

  return {
    job_id: jobId,
    status: "timeout",
    error: `Job polling timed out after ${maxAttempts} attempts`,
    cost_ticks: 0,
  };
}

/**
 * List all jobs for the authenticated user.
 * @internal
 */
export async function listJobs(
  client: QuantumClient,
): Promise<JobListResponse> {
  const { data } = await client._doJSON<JobListResponse>(
    "GET",
    "/qai/v1/jobs",
    undefined,
  );

  return data;
}

/**
 * Convenience method for 3D model generation via the async jobs system.
 * Submits a job with type "3d/generate" and the given parameters.
 * @internal
 */
export async function generate3D(
  client: QuantumClient,
  model: string,
  prompt?: string,
  imageUrl?: string,
): Promise<JobCreateResponse> {
  const params: Record<string, unknown> = { model };
  if (prompt) params.prompt = prompt;
  if (imageUrl) params.image_url = imageUrl;

  return createJob(client, { type: "3d/generate", params });
}

/**
 * Submit a chat completion as an async job. Useful for long-running
 * models (e.g. Opus) where synchronous /qai/v1/chat may time out.
 *
 * Params are the same shape as ChatRequest (model, messages, tools, etc.)
 * Use streamJob() or pollJob() to get the result.
 * @internal
 */
export async function chatJob(
  client: QuantumClient,
  req: Omit<ChatRequest, "stream">,
): Promise<JobCreateResponse> {
  return createJob(client, {
    type: "chat",
    params: req as Record<string, unknown>,
  });
}

/**
 * Stream job progress via SSE. Yields events as the job runs.
 *
 * Events: { type: "progress", status } | { type: "complete", result, cost_ticks } | { type: "error", error }
 *
 * If the job is already terminal, yields one event and returns.
 * @internal
 */
export async function* streamJob(
  client: QuantumClient,
  jobId: string,
  signal?: AbortSignal,
): AsyncIterableIterator<JobStreamEvent> {
  // Job stream is GET, not POST — use _doJSON's fetch directly.
  const headers: Record<string, string> = {
    Authorization: `Bearer ${client._apiKey}`,
    Accept: "text/event-stream",
  };
  const response = await (client as any)._fetch(
    `${client._baseUrl}/qai/v1/jobs/${jobId}/stream`,
    { method: "GET", headers, signal },
  );
  if (!response.ok) {
    throw new Error(`Job stream error (${response.status})`);
  }

  const reader = response.body;
  if (!reader) {
    throw new Error("qai: response body is null");
  }

  const decoder = new TextDecoder();
  const streamReader = reader.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await streamReader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") return;

        let event: JobStreamEvent;
        try {
          event = JSON.parse(payload) as JobStreamEvent;
        } catch {
          yield { type: "error", error: "parse SSE: invalid JSON" };
          return;
        }

        yield event;

        if (event.type === "complete" || event.type === "error") {
          return;
        }
      }
    }
  } finally {
    streamReader.releaseLock();
  }
}
