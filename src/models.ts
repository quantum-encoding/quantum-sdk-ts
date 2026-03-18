import type { QuantumClient } from "./client.js";
import type {
  ModelInfo,
  ModelsResponseBody,
  PricingInfo,
  PricingResponseBody,
} from "./types.js";

/**
 * List all available models with provider and pricing information.
 * @internal — called by QuantumClient.listModels()
 */
export async function listModels(
  client: QuantumClient,
): Promise<ModelInfo[]> {
  const { data } = await client._doJSON<ModelsResponseBody>(
    "GET",
    "/qai/v1/models",
    undefined,
  );

  return data.models;
}

/**
 * Get the complete pricing table for all models.
 * @internal — called by QuantumClient.getPricing()
 */
export async function getPricing(
  client: QuantumClient,
): Promise<PricingInfo[]> {
  const { data } = await client._doJSON<PricingResponseBody>(
    "GET",
    "/qai/v1/pricing",
    undefined,
  );

  return data.pricing;
}
