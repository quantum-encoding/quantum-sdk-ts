import type { QuantumClient } from "./client.js";
import type {
  BalanceResponse,
  UsageQuery,
  UsageResponse,
  UsageSummaryResponse,
  AccountPricingResponse,
} from "./types.js";

/**
 * Get account credit balance.
 * @internal — called by QuantumClient.accountBalance()
 */
export async function accountBalance(
  client: QuantumClient,
): Promise<BalanceResponse> {
  const { data } = await client._doJSON<BalanceResponse>(
    "GET",
    "/qai/v1/account/balance",
    undefined,
  );

  return data;
}

/**
 * Get paginated usage history.
 * @internal — called by QuantumClient.accountUsage()
 */
export async function accountUsage(
  client: QuantumClient,
  query?: UsageQuery,
): Promise<UsageResponse> {
  let path = "/qai/v1/account/usage";
  const params: string[] = [];

  if (query?.limit !== undefined) {
    params.push(`limit=${query.limit}`);
  }
  if (query?.start_after !== undefined) {
    params.push(`start_after=${query.start_after}`);
  }
  if (params.length > 0) {
    path += `?${params.join("&")}`;
  }

  const { data } = await client._doJSON<UsageResponse>(
    "GET",
    path,
    undefined,
  );

  return data;
}

/**
 * Get monthly usage summary.
 * @internal — called by QuantumClient.accountUsageSummary()
 */
export async function accountUsageSummary(
  client: QuantumClient,
  months?: number,
): Promise<UsageSummaryResponse> {
  let path = "/qai/v1/account/usage/summary";
  if (months !== undefined) {
    path += `?months=${months}`;
  }

  const { data } = await client._doJSON<UsageSummaryResponse>(
    "GET",
    path,
    undefined,
  );

  return data;
}

/**
 * Get the full pricing table (model ID → pricing entry map).
 * @internal — called by QuantumClient.accountPricing()
 */
export async function accountPricing(
  client: QuantumClient,
): Promise<AccountPricingResponse> {
  const { data } = await client._doJSON<AccountPricingResponse>(
    "GET",
    "/qai/v1/pricing",
    undefined,
  );

  return data;
}
