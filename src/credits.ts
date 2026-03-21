import type { QuantumClient } from "./client.js";
import type {
  CreditPacksResponse,
  CreditPurchaseRequest,
  CreditPurchaseResponse,
  CreditBalanceResponse,
  CreditTiersResponse,
  DevProgramApplyRequest,
  DevProgramApplyResponse,
} from "./types.js";

/**
 * List available credit packs. No authentication required.
 * @internal — called by QuantumClient.creditPacks()
 */
export async function creditPacks(
  client: QuantumClient,
): Promise<CreditPacksResponse> {
  const { data } = await client._doJSON<CreditPacksResponse>(
    "GET",
    "/qai/v1/credits/packs",
    undefined,
  );
  return data;
}

/**
 * Purchase a credit pack. Returns a checkout URL for payment.
 * @internal — called by QuantumClient.creditPurchase()
 */
export async function creditPurchase(
  client: QuantumClient,
  req: CreditPurchaseRequest,
): Promise<CreditPurchaseResponse> {
  const { data } = await client._doJSON<CreditPurchaseResponse>(
    "POST",
    "/qai/v1/credits/purchase",
    req,
  );
  return data;
}

/**
 * Get the current credit balance.
 * @internal — called by QuantumClient.creditBalance()
 */
export async function creditBalance(
  client: QuantumClient,
): Promise<CreditBalanceResponse> {
  const { data } = await client._doJSON<CreditBalanceResponse>(
    "GET",
    "/qai/v1/credits/balance",
    undefined,
  );
  return data;
}

/**
 * List available credit tiers. No authentication required.
 * @internal — called by QuantumClient.creditTiers()
 */
export async function creditTiers(
  client: QuantumClient,
): Promise<CreditTiersResponse> {
  const { data } = await client._doJSON<CreditTiersResponse>(
    "GET",
    "/qai/v1/credits/tiers",
    undefined,
  );
  return data;
}

/**
 * Apply for the developer program.
 * @internal — called by QuantumClient.devProgramApply()
 */
export async function devProgramApply(
  client: QuantumClient,
  req: DevProgramApplyRequest,
): Promise<DevProgramApplyResponse> {
  const { data } = await client._doJSON<DevProgramApplyResponse>(
    "POST",
    "/qai/v1/credits/dev-program",
    req,
  );
  return data;
}
