import type { QuantumClient } from "./client.js";
import type {
  CreateKeyRequest,
  CreateKeyResponse,
  ListKeysResponse,
  StatusResponse,
} from "./types.js";

/**
 * Create a scoped API key.
 * @internal — called by QuantumClient.createKey()
 */
export async function createKey(
  client: QuantumClient,
  req: CreateKeyRequest,
): Promise<CreateKeyResponse> {
  const { data } = await client._doJSON<CreateKeyResponse>(
    "POST",
    "/qai/v1/keys",
    req,
  );

  return data;
}

/**
 * List all API keys for the authenticated user.
 * @internal — called by QuantumClient.listKeys()
 */
export async function listKeys(
  client: QuantumClient,
): Promise<ListKeysResponse> {
  const { data } = await client._doJSON<ListKeysResponse>(
    "GET",
    "/qai/v1/keys",
    undefined,
  );

  return data;
}

/**
 * Revoke an API key.
 * @internal — called by QuantumClient.revokeKey()
 */
export async function revokeKey(
  client: QuantumClient,
  id: string,
): Promise<StatusResponse> {
  const { data } = await client._doJSON<StatusResponse>(
    "DELETE",
    `/qai/v1/keys/${id}`,
    undefined,
  );

  return data;
}
