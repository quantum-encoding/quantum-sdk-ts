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

  return backfillMeta(data, meta);
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

  return backfillMeta(data, meta);
}

/**
 * Generate sound effects from a text prompt (ElevenLabs).
 * @internal — called by QuantumClient.soundEffects()
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

  return backfillMeta(data, meta);
}

/**
 * Generate multi-speaker dialogue audio (ElevenLabs).
 * @internal — called by QuantumClient.dialogue()
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
 * @internal — called by QuantumClient.speechToSpeech()
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
 * @internal — called by QuantumClient.isolateVoice()
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

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * Transform a voice by modifying attributes (ElevenLabs).
 * @internal — called by QuantumClient.remixVoice()
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

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * Dub audio/video into a target language (ElevenLabs).
 * @internal — called by QuantumClient.dub()
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

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * Get word-level timestamps for audio+text alignment (ElevenLabs).
 * @internal — called by QuantumClient.align()
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

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * Generate voice previews from a text description (ElevenLabs).
 * @internal — called by QuantumClient.voiceDesign()
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

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}

/**
 * Generate speech using HeyGen's Starfish TTS model.
 * @internal — called by QuantumClient.starfishTTS()
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

  if (!data.cost_ticks) {
    data.cost_ticks = meta.costTicks;
  }
  if (!data.request_id) {
    data.request_id = meta.requestId;
  }

  return data;
}
