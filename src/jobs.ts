import type { QuantumClient } from "./client.js";
import type {
  JobCreateRequest,
  JobCreateResponse,
  JobListResponse,
  JobStatusResponse,
} from "./types.js";

/**
 * Create an async job. Returns the job ID for polling.
 * @internal — called by QuantumClient.createJob()
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
 * @internal — called by QuantumClient.getJob()
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
 * @internal — called by QuantumClient.pollJob()
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
 * @internal — called by QuantumClient.listJobs()
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
