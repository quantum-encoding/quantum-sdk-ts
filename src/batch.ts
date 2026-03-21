import type { QuantumClient } from "./client.js";
import type {
  BatchSubmitRequest,
  BatchSubmitResponse,
  BatchJsonlResponse,
  BatchJobsResponse,
  BatchJobInfo,
} from "./types.js";

/**
 * Submit a batch of jobs for processing.
 * @internal — called by QuantumClient.batchSubmit()
 */
export async function batchSubmit(
  client: QuantumClient,
  req: BatchSubmitRequest,
): Promise<BatchSubmitResponse> {
  const { data } = await client._doJSON<BatchSubmitResponse>(
    "POST",
    "/qai/v1/batch",
    req,
  );
  return data;
}

/**
 * Submit a batch of jobs using JSONL format.
 * @internal — called by QuantumClient.batchSubmitJsonl()
 */
export async function batchSubmitJsonl(
  client: QuantumClient,
  jsonl: string,
): Promise<BatchJsonlResponse> {
  const { data } = await client._doJSON<BatchJsonlResponse>(
    "POST",
    "/qai/v1/batch/jsonl",
    { jsonl },
  );
  return data;
}

/**
 * List all batch jobs for the account.
 * @internal — called by QuantumClient.batchJobs()
 */
export async function batchJobs(
  client: QuantumClient,
): Promise<BatchJobsResponse> {
  const { data } = await client._doJSON<BatchJobsResponse>(
    "GET",
    "/qai/v1/batch/jobs",
    undefined,
  );
  return data;
}

/**
 * Get the status and result of a single batch job.
 * @internal — called by QuantumClient.batchJob()
 */
export async function batchJob(
  client: QuantumClient,
  id: string,
): Promise<BatchJobInfo> {
  const { data } = await client._doJSON<BatchJobInfo>(
    "GET",
    `/qai/v1/batch/jobs/${id}`,
    undefined,
  );
  return data;
}
