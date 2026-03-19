import type { ContactRequest, StatusResponse } from "./types.js";
import { DEFAULT_BASE_URL } from "./types.js";
import { parseAPIError } from "./errors.js";

/**
 * Send a contact form message. This is a public endpoint (no auth required).
 *
 * Unlike other SDK methods, this is a standalone function rather than a
 * QuantumClient method because it does not require an API key.
 *
 * @param req - Contact form data.
 * @param baseUrl - API base URL (defaults to production).
 * @param fetchFn - Custom fetch implementation.
 */
export async function contact(
  req: ContactRequest,
  baseUrl?: string,
  fetchFn?: typeof globalThis.fetch,
): Promise<StatusResponse> {
  const url = `${baseUrl ?? DEFAULT_BASE_URL}/qai/v1/contact`;
  const doFetch = fetchFn ?? globalThis.fetch.bind(globalThis);

  const response = await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const requestId = response.headers.get("X-QAI-Request-Id") ?? "";
    throw await parseAPIError(response, requestId);
  }

  return (await response.json()) as StatusResponse;
}
