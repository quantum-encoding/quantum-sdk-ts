import type { QuantumClient } from "./client.js";
import type {
  MusicRequest,
  MusicResponse,
  STTRequest,
  STTResponse,
  TTSRequest,
  TTSResponse,
} from "./types.js";

/**
 * Generate speech from text.
 * @internal — called by QuantumClient.speak()
 */
export async function speak(
  client: QuantumClient,
  req: TTSRequest,
): Promise<TTSResponse> {
  const { data, meta } = await client._doJSON<TTSResponse>(
    "POST",
    "/qai/v1/audio/tts",
    req,
  );

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * Convert speech to text.
 * @internal — called by QuantumClient.transcribe()
 */
export async function transcribe(
  client: QuantumClient,
  req: STTRequest,
): Promise<STTResponse> {
  const { data, meta } = await client._doJSON<STTResponse>(
    "POST",
    "/qai/v1/audio/stt",
    req,
  );

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * Generate music from a text prompt.
 * @internal — called by QuantumClient.generateMusic()
 */
export async function generateMusic(
  client: QuantumClient,
  req: MusicRequest,
): Promise<MusicResponse> {
  const { data, meta } = await client._doJSON<MusicResponse>(
    "POST",
    "/qai/v1/audio/music",
    req,
  );

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}
