// Tests for the media receipt fields the gateway returns on video and music
// generation: duration_seconds on both, and usage on video.
//
// The gateway is mocked via the ClientOptions.fetch injection point — no
// network calls are made. Run with: npm test
//
// Tests import the compiled dist/ output (the build runs first in the test
// script), matching what consumers of the package actually execute.

import { test } from "node:test";
import assert from "node:assert/strict";

import { QuantumClient } from "../dist/client.js";

const API_KEY = "qai_test_key";

/** Build a QuantumClient whose fetch returns the given payload. */
function mockClient(payload: unknown): QuantumClient {
  const fetchMock = (async (): Promise<Response> =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof globalThis.fetch;

  return new QuantumClient(API_KEY, { fetch: fetchMock });
}

test("generateVideo: a token-billed receipt decodes duration and every usage bucket", async () => {
  const client = mockClient({
    videos: [
      { base64: "AAAA", format: "mp4", size_bytes: 184320, index: 0 },
    ],
    model: "gemini-omni-video",
    duration_seconds: 8.5,
    usage: {
      prompt_tokens: 412,
      completion_tokens: 49232,
      reasoning_tokens: 96,
      cached_tokens: 128,
      total_tokens: 49868,
    },
    cost_ticks: 1247000000,
    balance_after: 73,
    request_id: "qai_req_2f1c8ab0-91d",
  });

  const resp = await client.generateVideo({
    model: "gemini-omni-video",
    prompt: "a golden duck taking off",
  });

  assert.equal(resp.duration_seconds, 8.5);
  assert.deepEqual(resp.usage, {
    prompt_tokens: 412,
    completion_tokens: 49232,
    reasoning_tokens: 96,
    cached_tokens: 128,
    total_tokens: 49868,
  });
});

// A per-second model reports no tokens and the gateway sends no usage object
// at all. Absent must stay absent: zeros here would read as a token-billed
// call that spent nothing, and would report a 0% cache hit rate on a model
// that has no cache.
test("generateVideo: a per-second receipt reports nothing rather than zero", async () => {
  const client = mockClient({
    videos: [
      { base64: "AAAA", format: "mp4", size_bytes: 184320, index: 0 },
    ],
    model: "veo-2",
    cost_ticks: 3200000000,
    balance_after: 41,
    request_id: "qai_req_7d5e0c14-33a",
  });

  const resp = await client.generateVideo({
    model: "veo-2",
    prompt: "a golden duck taking off",
  });

  assert.equal(resp.duration_seconds, undefined, "a duration was invented");
  assert.equal(resp.usage, undefined, "a usage block was invented");
});

// A partially reported usage keeps the buckets the provider did not send
// distinct from the ones it reported as zero.
test("generateVideo: unreported buckets differ from reported zeros", async () => {
  const client = mockClient({
    videos: [],
    model: "gemini-omni-video",
    duration_seconds: 4,
    usage: { completion_tokens: 23168, cached_tokens: 0 },
    cost_ticks: 1,
    balance_after: 1,
    request_id: "r",
  });

  const resp = await client.generateVideo({
    model: "gemini-omni-video",
    prompt: "a golden duck landing",
  });

  assert.equal(resp.usage?.cached_tokens, 0, "a reported zero was dropped");
  assert.equal(
    resp.usage?.prompt_tokens,
    undefined,
    "an unreported bucket became a zero",
  );
  assert.equal(
    resp.usage?.reasoning_tokens,
    undefined,
    "an unreported bucket became a zero",
  );
  assert.equal(
    resp.usage?.total_tokens,
    undefined,
    "an unreported bucket became a zero",
  );
});

// Music is duration-metered, so the generated length is the basis of the
// charge and has to survive the wire.
test("generateMusic: the receipt decodes the generated duration", async () => {
  const client = mockClient({
    audio_clips: [
      { base64: "SUQz", format: "mp3", size_bytes: 2941184, index: 0 },
    ],
    model: "lyria-002",
    duration_seconds: 184,
    cost_ticks: 1840000000,
    balance_after: 57,
    request_id: "qai_req_bb31f907-4c1",
  });

  const resp = await client.generateMusic({
    model: "lyria-002",
    prompt: "slow ambient synth",
  });

  assert.equal(resp.duration_seconds, 184);
});

// A provider that reports no length leaves it absent, not 0 — a zero here
// would claim a measured empty track.
test("generateMusic: an unreported duration stays undefined", async () => {
  const client = mockClient({
    audio_clips: [],
    model: "eleven-music",
    cost_ticks: 600000000,
    balance_after: 55,
    request_id: "r",
  });

  const resp = await client.generateMusic({
    model: "eleven-music",
    prompt: "slow ambient synth",
  });

  assert.equal(resp.duration_seconds, undefined, "a duration was invented");
});
