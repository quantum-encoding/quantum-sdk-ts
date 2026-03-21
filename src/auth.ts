import type { QuantumClient } from "./client.js";
import type {
  AuthAppleRequest,
  AuthResponse,
} from "./types.js";

/**
 * Authenticate with Apple Sign-In.
 * @internal — called by QuantumClient.authApple()
 */
export async function authApple(
  client: QuantumClient,
  req: AuthAppleRequest,
): Promise<AuthResponse> {
  const { data } = await client._doJSON<AuthResponse>(
    "POST",
    "/qai/v1/auth/apple",
    req,
  );
  return data;
}
