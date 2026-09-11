// The chat wire contract the gateway added on 2026-09-11: the reasoning state
// a tool loop must hand back, the cache key that keeps a conversation on one
// provider shard, and the Gemini 3 signature that now rides text blocks too.
//
// Run with: npm test

import { test } from "node:test";
import assert from "node:assert/strict";

import { QuantumClient } from "../dist/client.js";
import type { ChatRequest, ContentBlock, StreamEvent } from "../dist/types.js";

const API_KEY = "qai_test_key";

/** Captures the outgoing request body so a test can assert on the wire. */
function capturingClient(payload: unknown): {
  client: QuantumClient;
  sent: () => Record<string, unknown>;
} {
  let body: Record<string, unknown> = {};
  const fetchMock = (async (_url: string, init: RequestInit): Promise<Response> => {
    body = JSON.parse(String(init.body));
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof globalThis.fetch;

  return {
    client: new QuantumClient(API_KEY, { fetch: fetchMock }),
    sent: () => body,
  };
}

const OK = { id: "msg_1", model: "gpt-5.6", content: [{ type: "text", text: "ok" }] };

test("prompt_cache_key rides the request only when the caller sets one", async () => {
  const bare = capturingClient(OK);
  await bare.client.chat({ model: "gpt-5.6", messages: [{ role: "user", content: "hi" }] });
  assert.ok(
    !("prompt_cache_key" in bare.sent()),
    "prompt_cache_key sent on a request that named none",
  );

  const keyed = capturingClient(OK);
  await keyed.client.chat({
    model: "gpt-5.6",
    messages: [{ role: "user", content: "hi" }],
    prompt_cache_key: "conv-7f3a",
  });
  assert.equal(keyed.sent().prompt_cache_key, "conv-7f3a");
});

test("a reasoning block round-trips verbatim, in the position it arrived in", async () => {
  const reasoning = { id: "rs_abc", summary: [], encrypted_content: "Zm9v" };
  const read = capturingClient({
    id: "msg_2",
    model: "gpt-5.6",
    stop_reason: "tool_use",
    content: [
      { type: "reasoning", reasoning, minted_by: "gpt-5.6" },
      { type: "tool_use", id: "call_1", name: "lookup", input: { q: "x" } },
    ],
  });

  const res = await read.client.chat({
    model: "gpt-5.6",
    messages: [{ role: "user", content: "weather?" }],
  });

  const blocks = res.content as ContentBlock[];
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "reasoning");
  assert.equal(blocks[0].minted_by, "gpt-5.6");
  // Opaque: the SDK must not have reshaped the provider's item.
  assert.deepEqual(blocks[0].reasoning, reasoning);

  // Echoed back on the next turn's assistant message, unchanged and in the
  // same order — position is the state the provider reads.
  const echo = capturingClient(OK);
  await echo.client.chat({
    model: "gpt-5.6",
    messages: [
      { role: "user", content: "weather?" },
      { role: "assistant", content_blocks: blocks },
      { role: "tool", tool_call_id: "call_1", content: "12C" },
    ],
  });
  const sentBlocks = (echo.sent().messages as Array<Record<string, unknown>>)[1]
    .content_blocks as ContentBlock[];
  assert.equal(sentBlocks[0].type, "reasoning");
  assert.equal(sentBlocks[1].type, "tool_use");
  assert.deepEqual(sentBlocks[0].reasoning, reasoning);
  assert.equal(sentBlocks[0].minted_by, "gpt-5.6");
});

test("a turn with no reasoning state sends no reasoning fields", async () => {
  const c = capturingClient(OK);
  await c.client.chat({
    model: "claude-opus-4-8",
    messages: [
      { role: "user", content: "hi" },
      { role: "assistant", content_blocks: [{ type: "text", text: "hello" }] },
    ],
  });
  const block = (c.sent().messages as Array<Record<string, unknown>>)[1]
    .content_blocks as ContentBlock[];
  for (const key of ["reasoning", "minted_by", "thought_signature"]) {
    assert.ok(!(key in block[0]), `${key} sent on a plain text block`);
  }
});

test("Gemini 3 signs a turn that ends in text, not only its tool calls", async () => {
  const c = capturingClient({
    id: "msg_3",
    model: "gemini-3.5-flash",
    stop_reason: "stop",
    content: [{ type: "text", text: "hi", thought_signature: "c2ln" }],
  });
  const res = await c.client.chat({
    model: "gemini-3.5-flash",
    messages: [{ role: "user", content: "hi" }],
  });
  assert.equal((res.content as ContentBlock[])[0].thought_signature, "c2ln");
});

test("the thought_signature SSE event lands on the stream event", async () => {
  const sse = [
    'data: {"type":"content_delta","delta":{"text":"hi"}}\n\n',
    'data: {"type":"thought_signature","thought_signature":"c2ln"}\n\n',
    "data: [DONE]\n\n",
  ].join("");

  const fetchMock = (async (): Promise<Response> =>
    new Response(sse, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    })) as typeof globalThis.fetch;
  const client = new QuantumClient(API_KEY, { fetch: fetchMock });

  const events: StreamEvent[] = [];
  for await (const ev of client.chatStream({
    model: "gemini-3.5-flash",
    messages: [{ role: "user", content: "hi" }],
  })) {
    events.push(ev);
  }

  const sig = events.find((e) => e.type === "thought_signature");
  assert.ok(sig, "no thought_signature event");
  assert.equal(sig.thought_signature, "c2ln");
  assert.equal(events[0].thought_signature, undefined);
});

test("provider_options is an open map — nested, flat and unknown keys all ride", async () => {
  const c = capturingClient(OK);
  const req: ChatRequest = {
    model: "gpt-5.6",
    messages: [{ role: "user", content: "hi" }],
    provider_options: {
      openai: {
        reasoning_summary: "detailed",
        reasoning_mode: "pro",
        verbosity: "low",
        text_format: "json_object",
        a_key_this_sdk_never_heard_of: 42,
      },
      xai: { native_files: true },
      // Flat entry — a Record<string, Record<string, unknown>> could not
      // express this, which is why the type is open.
      region: "europe",
    },
  };
  await c.client.chat(req);

  const opts = c.sent().provider_options as Record<string, unknown>;
  const openai = opts.openai as Record<string, unknown>;
  assert.equal(openai.reasoning_mode, "pro");
  assert.equal(openai.text_format, "json_object");
  assert.equal(openai.a_key_this_sdk_never_heard_of, 42);
  assert.equal((opts.xai as Record<string, unknown>).native_files, true);
  assert.equal(opts.region, "europe");
});

test("reasoning_effort carries every tier the gateway validates, max included", async () => {
  for (const tier of ["none", "low", "medium", "high", "xhigh", "max"]) {
    const c = capturingClient(OK);
    await c.client.chat({
      model: "gpt-5.6",
      messages: [{ role: "user", content: "hi" }],
      reasoning_effort: tier,
    });
    assert.equal(c.sent().reasoning_effort, tier);
  }
});
