import type { QuantumClient } from "./client.js";
import type {
  DeleteResponse,
  InstanceResponse,
  InstancesResponse,
  ProvisionRequest,
  ProvisionResponse,
  SSHKeyRequest,
  StatusResponse,
  TemplatesResponse,
} from "./types.js";

/**
 * Get available compute templates with pricing.
 * @internal — called by QuantumClient.computeTemplates()
 */
export async function computeTemplates(
  client: QuantumClient,
): Promise<TemplatesResponse> {
  const { data } = await client._doJSON<TemplatesResponse>(
    "GET",
    "/qai/v1/compute/templates",
    undefined,
  );

  return data;
}

/**
 * Provision a new GPU compute instance.
 * @internal — called by QuantumClient.computeProvision()
 */
export async function computeProvision(
  client: QuantumClient,
  req: ProvisionRequest,
): Promise<ProvisionResponse> {
  const { data } = await client._doJSON<ProvisionResponse>(
    "POST",
    "/qai/v1/compute/provision",
    req,
  );

  return data;
}

/**
 * List all compute instances for the authenticated user.
 * @internal — called by QuantumClient.computeInstances()
 */
export async function computeInstances(
  client: QuantumClient,
): Promise<InstancesResponse> {
  const { data } = await client._doJSON<InstancesResponse>(
    "GET",
    "/qai/v1/compute/instances",
    undefined,
  );

  return data;
}

/**
 * Get full status of a single compute instance.
 * @internal — called by QuantumClient.computeInstance()
 */
export async function computeInstance(
  client: QuantumClient,
  id: string,
): Promise<InstanceResponse> {
  const { data } = await client._doJSON<InstanceResponse>(
    "GET",
    `/qai/v1/compute/instance/${id}`,
    undefined,
  );

  return data;
}

/**
 * Tear down a compute instance and finalize billing.
 * @internal — called by QuantumClient.computeDelete()
 */
export async function computeDelete(
  client: QuantumClient,
  id: string,
): Promise<DeleteResponse> {
  const { data } = await client._doJSON<DeleteResponse>(
    "DELETE",
    `/qai/v1/compute/instance/${id}`,
    undefined,
  );

  return data;
}

/**
 * Inject an SSH public key into a running instance.
 * @internal — called by QuantumClient.computeSSHKey()
 */
export async function computeSSHKey(
  client: QuantumClient,
  id: string,
  req: SSHKeyRequest,
): Promise<StatusResponse> {
  const { data } = await client._doJSON<StatusResponse>(
    "POST",
    `/qai/v1/compute/instance/${id}/ssh-key`,
    req,
  );

  return data;
}

/**
 * Reset the inactivity timer on a compute instance.
 * @internal — called by QuantumClient.computeKeepalive()
 */
export async function computeKeepalive(
  client: QuantumClient,
  id: string,
): Promise<StatusResponse> {
  const { data } = await client._doJSON<StatusResponse>(
    "POST",
    `/qai/v1/compute/instance/${id}/keepalive`,
    undefined,
  );

  return data;
}
