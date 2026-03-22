import type { QuantumClient } from "./client.js";
import type {
  AddVoiceFromLibraryRequest,
  AddVoiceFromLibraryResponse,
  CloneVoiceRequest,
  CloneVoiceResponse,
  SharedVoicesResponse,
  StatusResponse,
  VoiceLibraryQuery,
  VoicesResponse,
} from "./types.js";

/**
 * List all available voices (ElevenLabs).
 * @internal -- called by QuantumClient.listVoices()
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
 * @internal -- called by QuantumClient.cloneVoice()
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
 * @internal -- called by QuantumClient.deleteVoice()
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

/**
 * Browse the shared voice library with optional filters.
 * @internal -- called by QuantumClient.voiceLibrary()
 */
export async function voiceLibrary(
  client: QuantumClient,
  query?: VoiceLibraryQuery,
): Promise<SharedVoicesResponse> {
  const params = new URLSearchParams();
  if (query?.query) params.set("query", query.query);
  if (query?.page_size) params.set("page_size", String(query.page_size));
  if (query?.cursor) params.set("cursor", query.cursor);
  if (query?.gender) params.set("gender", query.gender);
  if (query?.language) params.set("language", query.language);
  if (query?.use_case) params.set("use_case", query.use_case);

  const qs = params.toString();
  const path = qs ? `/qai/v1/voices/library?${qs}` : "/qai/v1/voices/library";

  const { data } = await client._doJSON<SharedVoicesResponse>(
    "GET",
    path,
    undefined,
  );

  return data;
}

/**
 * Add a shared voice from the library to the user's account.
 * @internal -- called by QuantumClient.addVoiceFromLibrary()
 */
export async function addVoiceFromLibrary(
  client: QuantumClient,
  req: AddVoiceFromLibraryRequest,
): Promise<AddVoiceFromLibraryResponse> {
  const { data } = await client._doJSON<AddVoiceFromLibraryResponse>(
    "POST",
    "/qai/v1/voices/library/add",
    req,
  );

  return data;
}
