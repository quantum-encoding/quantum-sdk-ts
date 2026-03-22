import type { QuantumClient } from "./client.js";
import type {
  JobCreateRequest,
  JobCreateResponse,
  JobListResponse,
  JobStatusResponse,
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
