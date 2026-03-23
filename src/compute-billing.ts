import type { QuantumClient } from "./client.js";

// ── Compute Billing Types ────────────────────────────────────────────

export interface BillingRequest {
  /** Filter by instance ID. */
  instance_id?: string;
  /** Start date for billing period (ISO 8601). */
  start_date?: string;
  /** End date for billing period (ISO 8601). */
  end_date?: string;
}

export interface BillingEntry {
  /** Instance identifier. */
  instance_id: string;
  /** Instance name. */
  instance_name?: string;
  /** Total cost in USD. */
  cost_usd: number;
  /** Usage duration in hours. */
  usage_hours?: number;
  /** SKU description. */
  sku_description?: string;
  /** Billing period start. */
  start_time?: string;
  /** Billing period end. */
  end_time?: string;
}

export interface BillingResponse {
  /** Individual billing entries. */
  entries: BillingEntry[];
  /** Total cost across all entries. */
  total_cost_usd: number;
}

// ── Function ─────────────────────────────────────────────────────────

/**
 * Query compute billing from BigQuery via the QAI backend.
 * @internal — called by QuantumClient.computeBilling()
 */
export async function computeBilling(
  client: QuantumClient,
  req: BillingRequest,
): Promise<BillingResponse> {
  const { data } = await client._doJSON<BillingResponse>(
    "POST",
    "/qai/v1/compute/billing",
    req,
  );

  return data;
}
