import type { QuantumClient } from "./client.js";
import type {
  CloneVoiceRequest,
  CloneVoiceResponse,
  StatusResponse,
  VoicesResponse,
} from "./types.js";

/**
 * List all available voices (ElevenLabs).
 * @internal — called by QuantumClient.listVoices()
 */
export async function listVoices(
  client: QuantumClient,
): Promise<VoicesResponse> {
  const { data } = await client._doJSON<VoicesResponse>(
    "GET",
    "/qai/v1/voices",
    undefined,
  );

  return data;
}

/**
 * Create an instant voice clone from audio samples.
 * @internal — called by QuantumClient.cloneVoice()
 */
export async function cloneVoice(
  client: QuantumClient,
  req: CloneVoiceRequest,
): Promise<CloneVoiceResponse> {
  const { data } = await client._doJSON<CloneVoiceResponse>(
    "POST",
    "/qai/v1/voices/clone",
    req,
  );

  return data;
}

/**
 * Delete a cloned voice.
 * @internal — called by QuantumClient.deleteVoice()
 */
export async function deleteVoice(
  client: QuantumClient,
  id: string,
): Promise<StatusResponse> {
  const { data } = await client._doJSON<StatusResponse>(
    "DELETE",
    `/qai/v1/voices/${id}`,
    undefined,
  );

  return data;
}
