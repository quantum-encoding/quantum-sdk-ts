// The audio share of a chat turn's input.
//
// Several Gemini models price audio input above text — 3.3x the text rate on
// gemini-2.5-flash, 2x on gemini-3.1-flash-lite — so a turn carrying audio
// costs more than its token counts appear to justify. Without the split a
// caller sees a charge with nothing on the wire to account for it.
//
// The counts are a SHARE of the buckets they belong to, never an addition:
// summing them double-counts, which is the obvious way to get this wrong.
//
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { QuantumClient } from "../dist/client.js";
import type { ChatUsage } from "../dist/types.js";

const API_KEY = "qai_test_key";

function mockClient(payload: unknown): QuantumClient {
  const fetchMock = (async (): Promise<Response> =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof globalThis.fetch;

  return new QuantumClient(API_KEY, { fetch: fetchMock });
}

test("chat usage carries the audio share of the input", async () => {
  const client = mockClient({
    id: "msg_1",
    model: "gemini-2.5-flash",
    content: [{ type: "text", text: "ok" }],
    usage: {
      input_tokens: 100000,
      output_tokens: 250,
      cost_ticks: 4200,
      cached_tokens: 20000,
      audio_tokens: 40000,
      cached_audio_tokens: 5000,
    },
  });

  const res = await client.chat({
    model: "gemini-2.5-flash",
    messages: [{ role: "user", content: "hi" }],
  });
  const u = res.usage as ChatUsage;

  assert.equal(u.audio_tokens, 40000);
  assert.equal(u.cached_audio_tokens, 5000);

  // A share, never larger than the bucket it belongs to.
  assert.ok(u.audio_tokens! <= u.input_tokens);
  assert.ok(u.cached_audio_tokens! <= u.cached_tokens!);

  // The text remainder is what the base rate applies to.
  assert.equal(u.input_tokens - u.audio_tokens!, 60000);
});

test("a turn without audio reports no audio buckets", async () => {
  const client = mockClient({
    id: "msg_2",
    model: "claude-opus-4-8",
    content: [{ type: "text", text: "ok" }],
    usage: { input_tokens: 10, output_tokens: 2, cost_ticks: 7 },
  });

  const res = await client.chat({
    model: "claude-opus-4-8",
    messages: [{ role: "user", content: "hi" }],
  });
  const u = res.usage as ChatUsage;

  // Undefined means "no audio premium applies", which is also what a model
  // pricing audio at its text rate reports.
  assert.equal(u.audio_tokens, undefined);
  assert.equal(u.cached_audio_tokens, undefined);
});
