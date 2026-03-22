import type { QuantumClient } from "./client.js";
import type {
  AlignRequest,
  AlignResponse,
  DialogueRequest,
  DialogueResponse,
  DubRequest,
  DubResponse,
  IsolateVoiceRequest,
  IsolateVoiceResponse,
  MusicAdvancedRequest,
  MusicAdvancedResponse,
  MusicFinetuneCreateRequest,
  MusicFinetuneInfo,
  MusicFinetuneListResponse,
  MusicRequest,
  MusicResponse,
  RemixVoiceRequest,
  RemixVoiceResponse,
  SoundEffectRequest,
  SoundEffectResponse,
  SpeechToSpeechRequest,
  SpeechToSpeechResponse,
  StarfishTTSRequest,
  StarfishTTSResponse,
  StatusResponse,
  STTRequest,
  STTResponse,
  TTSRequest,
  TTSResponse,
  VoiceDesignRequest,
  VoiceDesignResponse,
} from "./types.js";

/**
 * Helper to backfill cost/request metadata from response headers.
 */
function backfillMeta<T extends { cost_ticks: number; request_id: string }>(
  data: T,
  meta: { costTicks: number; requestId: string },
): T {
  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }
  return data;
}

/**
 * Generate speech from text.
 * @internal
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

  return backfillMeta(data, meta);
}

/**
 * Convert speech to text.
 * @internal
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

  return backfillMeta(data, meta);
}

/**
 * Generate sound effects from a text prompt (ElevenLabs).
 * @internal
 */
export async function soundEffects(
  client: QuantumClient,
  req: SoundEffectRequest,
): Promise<SoundEffectResponse> {
  const { data, meta } = await client._doJSON<SoundEffectResponse>(
    "POST",
    "/qai/v1/audio/sound-effects",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Generate music from a text prompt.
 * @internal
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

  return backfillMeta(data, meta);
}

/**
 * Generate multi-speaker dialogue audio (ElevenLabs).
 * @internal
 */
export async function dialogue(
  client: QuantumClient,
  req: DialogueRequest,
): Promise<DialogueResponse> {
  const { data, meta } = await client._doJSON<DialogueResponse>(
    "POST",
    "/qai/v1/audio/dialogue",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Convert speech audio to a different voice (ElevenLabs).
 * @internal
 */
export async function speechToSpeech(
  client: QuantumClient,
  req: SpeechToSpeechRequest,
): Promise<SpeechToSpeechResponse> {
  const { data, meta } = await client._doJSON<SpeechToSpeechResponse>(
    "POST",
    "/qai/v1/audio/speech-to-speech",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Remove background noise and isolate speech (ElevenLabs).
 * @internal
 */
export async function isolateVoice(
  client: QuantumClient,
  req: IsolateVoiceRequest,
): Promise<IsolateVoiceResponse> {
  const { data, meta } = await client._doJSON<IsolateVoiceResponse>(
    "POST",
    "/qai/v1/audio/isolate",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Transform a voice by modifying attributes (ElevenLabs).
 * @internal
 */
export async function remixVoice(
  client: QuantumClient,
  req: RemixVoiceRequest,
): Promise<RemixVoiceResponse> {
  const { data, meta } = await client._doJSON<RemixVoiceResponse>(
    "POST",
    "/qai/v1/audio/remix",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Dub audio/video into a target language (ElevenLabs).
 * @internal
 */
export async function dub(
  client: QuantumClient,
  req: DubRequest,
): Promise<DubResponse> {
  const { data, meta } = await client._doJSON<DubResponse>(
    "POST",
    "/qai/v1/audio/dub",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Get word-level timestamps for audio+text alignment (ElevenLabs).
 * @internal
 */
export async function align(
  client: QuantumClient,
  req: AlignRequest,
): Promise<AlignResponse> {
  const { data, meta } = await client._doJSON<AlignResponse>(
    "POST",
    "/qai/v1/audio/align",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Generate voice previews from a text description (ElevenLabs).
 * @internal
 */
export async function voiceDesign(
  client: QuantumClient,
  req: VoiceDesignRequest,
): Promise<VoiceDesignResponse> {
  const { data, meta } = await client._doJSON<VoiceDesignResponse>(
    "POST",
    "/qai/v1/audio/voice-design",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Generate speech using HeyGen's Starfish TTS model.
 * @internal
 */
export async function starfishTTS(
  client: QuantumClient,
  req: StarfishTTSRequest,
): Promise<StarfishTTSResponse> {
  const { data, meta } = await client._doJSON<StarfishTTSResponse>(
    "POST",
    "/qai/v1/audio/starfish-tts",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * Generate music via ElevenLabs Eleven Music (advanced: finetunes, etc).
 * @internal
 */
export async function generateMusicAdvanced(
  client: QuantumClient,
  req: MusicAdvancedRequest,
): Promise<MusicAdvancedResponse> {
  const { data, meta } = await client._doJSON<MusicAdvancedResponse>(
    "POST",
    "/qai/v1/audio/music/advanced",
    req,
  );

  return backfillMeta(data, meta);
}

/**
 * List all music finetunes for the authenticated user.
 * @internal
 */
export async function listFinetunes(
  client: QuantumClient,
): Promise<MusicFinetuneListResponse> {
  const { data } = await client._doJSON<MusicFinetuneListResponse>(
    "GET",
    "/qai/v1/audio/finetunes",
    undefined,
  );

  return data;
}

/**
 * Create a new music finetune from audio samples (base64-encoded).
 * @internal
 */
export async function createFinetune(
  client: QuantumClient,
  req: MusicFinetuneCreateRequest,
): Promise<MusicFinetuneInfo> {
  const { data } = await client._doJSON<MusicFinetuneInfo>(
    "POST",
    "/qai/v1/audio/finetunes",
    req,
  );

  return data;
}

/**
 * Delete a music finetune by ID.
 * @internal
 */
export async function deleteFinetune(
  client: QuantumClient,
  id: string,
): Promise<StatusResponse> {
  const { data } = await client._doJSON<StatusResponse>(
    "DELETE",
    `/qai/v1/audio/finetunes/${id}`,
    undefined,
  );

  return data;
}
