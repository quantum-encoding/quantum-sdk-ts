// The TTS request contract on POST /qai/v1/audio/tts, and the voice catalogue
// on GET /qai/v1/voices.
//
// Gemini exposes no parameters for tone, accent or pace — the steering is
// prose in `instructions` plus inline tags inside `text` — so these tests pin
// the field names the handler actually decodes. Wire shapes come from
// internal/server/routes_media.go (ttsRequest, ttsVoiceSettings, ttsSpeaker,
// ttsResponse) and internal/server/routes_voice.go (voiceResponse).
//
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { QuantumClient } from "../dist/client.js";
import type { TTSRequest, TTSResponse, VoicesResponse } from "../dist/types.js";

const API_KEY = "qai_test_key";

/** Captures the outgoing body so a test can assert on the wire. */
function capturing(payload: unknown): {
  client: QuantumClient;
  sent: () => Record<string, unknown>;
} {
  let body: Record<string, unknown> = {};
  const fetchMock = (async (_url: string, init: RequestInit): Promise<Response> => {
    if (init?.body) body = JSON.parse(String(init.body));
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof globalThis.fetch;

  return { client: new QuantumClient(API_KEY, { fetch: fetchMock }), sent: () => body };
}

const AUDIO = {
  audio_base64: "SUQzBA",
  format: "mp3",
  size_bytes: 18320,
  model: "gemini-3.1-flash-tts-preview",
  cost_ticks: 4200,
  request_id: "qai_req_1",
};

test("text alone is a complete request — the gateway supplies the house voice", async () => {
  const c = capturing(AUDIO);
  await c.client.speak({ text: "Hello" });

  const body = c.sent();
  assert.equal(body.text, "Hello");
  for (const key of ["model", "voice", "speakers", "voice_settings", "instructions"]) {
    assert.ok(!(key in body), `${key} sent on a request that set none`);
  }
});

test("the steering fields ride under the names the handler decodes", async () => {
  const c = capturing(AUDIO);
  const req: TTSRequest = {
    model: "gemini-3.1-flash-tts-preview",
    text: "[excited] Hi! [whispers] can you keep a secret?",
    voice: "Laomedeia",
    format: "wav",
    speed: 1.1,
    instructions: "Read aloud with a natural British accent",
    language: "en-GB",
    sample_rate: 24000,
    bit_rate: 128000,
  };
  await c.client.speak(req);

  const body = c.sent();
  assert.equal(body.model, "gemini-3.1-flash-tts-preview");
  assert.equal(body.voice, "Laomedeia");
  assert.equal(body.format, "wav");
  // The old duplicate TtsRequest named this output_format, a key the handler
  // does not read — a request built from it lost its format silently.
  assert.ok(!("output_format" in body), "output_format is not a key the gateway reads");
  assert.equal(body.speed, 1.1);
  assert.equal(body.instructions, "Read aloud with a natural British accent");
  assert.equal(body.language, "en-GB");
  assert.equal(body.sample_rate, 24000);
  assert.equal(body.bit_rate, 128000);
});

test("a two-speaker dialogue serializes with labels matching the text", async () => {
  const c = capturing(AUDIO);
  await c.client.speak({
    text: "Lacey: Hi there.\nCustomer: [excited] Hi!",
    instructions: "Lacey is calm; the customer is cheerful",
    speakers: [
      { name: "Lacey", voice: "Laomedeia" },
      { name: "Customer", voice: "Puck" },
    ],
  });

  const speakers = c.sent().speakers as Array<Record<string, unknown>>;
  assert.equal(speakers.length, 2, "gemini takes exactly two speakers");
  assert.deepEqual(speakers[0], { name: "Lacey", voice: "Laomedeia" });
  assert.deepEqual(speakers[1], { name: "Customer", voice: "Puck" });
});

test("an unset ElevenLabs knob is absent, not zero", async () => {
  const c = capturing(AUDIO);
  await c.client.speak({
    text: "hi",
    voice_settings: { stability: 0.4, use_speaker_boost: true },
  });

  const vs = c.sent().voice_settings as Record<string, unknown>;
  assert.equal(vs.stability, 0.4);
  assert.equal(vs.use_speaker_boost, true);
  // 0.0 stability is a real setting the provider honours, so a zeroed object
  // would silently retune the voice rather than leave the default alone.
  assert.ok(!("similarity_boost" in vs), "an unset knob was sent as zero");
  assert.ok(!("style" in vs), "an unset knob was sent as zero");
});

test("the response carries the audio inline, not a URL", async () => {
  const c = capturing(AUDIO);
  const res: TTSResponse = await c.client.speak({ text: "hi" });

  // The gateway sends audio_base64/size_bytes. This type used to declare
  // audio_url/duration_seconds, neither of which the endpoint has ever sent,
  // so the audio was unreachable through the typed surface.
  assert.equal(res.audio_base64, "SUQzBA");
  assert.equal(res.size_bytes, 18320);
  assert.equal(res.model, "gemini-3.1-flash-tts-preview");
  assert.equal(res.format, "mp3");
});

test("the voice catalogue decodes every documented field", async () => {
  const payload = {
    voices: [
      {
        voice_id: "Laomedeia",
        name: "Laomedeia",
        category: "premade",
        provider: "gemini",
        model: "gemini-3.1-flash-tts-preview",
        is_cloned: false,
      },
      {
        voice_id: "el_7f3",
        name: "Rachel",
        category: "cloned",
        provider: "elevenlabs",
        model: "eleven_multilingual_v2",
        is_cloned: true,
        description: "warm narrator",
        preview_url: "https://cdn/x.mp3",
      },
    ],
    request_id: "qai_req_1",
  };
  const c = capturing(payload);
  const res = (await c.client.listVoices()) as VoicesResponse;

  assert.equal(res.voices.length, 2);
  const gemini = res.voices[0];
  assert.equal(gemini.provider, "gemini");
  // The model to pass back for this voice, so a picker never hardcodes the
  // provider-to-model mapping.
  assert.equal(gemini.model, "gemini-3.1-flash-tts-preview");
  assert.equal(gemini.is_cloned, false);

  const el = res.voices[1];
  assert.equal(el.category, "cloned");
  assert.equal(el.description, "warm narrator");
});
