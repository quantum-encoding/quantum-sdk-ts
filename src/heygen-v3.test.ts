// Tests for the HeyGen v3 gateway surface:
//   - Avatar Realtime (create / status / text / cancel)
//   - Audio sounds search
//   - Video template detail / generate (async job)
//   - Video batch submit / status
//
// The gateway is mocked via the ClientOptions.fetch injection point — no
// network calls are made. Run with: npm test
//
// Tests import the compiled dist/ output (the build runs first in the test
// script), matching what consumers of the package actually execute.

import { test } from "node:test";
import assert from "node:assert/strict";

import { QuantumClient } from "../dist/client.js";
import { APIError } from "../dist/errors.js";

const API_KEY = "qai_test_key";

interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  /** Parsed JSON body, or undefined when no body was sent. */
  body: unknown;
  calls: number;
}

/**
 * Build a QuantumClient whose fetch is mocked to capture the request and
 * return the given status/payload/headers.
 */
function mockClient(
  status: number,
  payload: unknown,
  respHeaders?: Record<string, string>,
): { client: QuantumClient; captured: Captured } {
  const captured: Captured = {
    url: "",
    method: "",
    headers: {},
    body: undefined,
    calls: 0,
  };

  const fetchMock = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    captured.calls++;
    captured.url = String(input);
    captured.method = init?.method ?? "GET";
    captured.headers = { ...(init?.headers as Record<string, string>) };
    captured.body =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;

    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", ...respHeaders },
    });
  }) as typeof globalThis.fetch;

  const client = new QuantumClient(API_KEY, { fetch: fetchMock });
  return { client, captured };
}

// ── Avatar Realtime ─────────────────────────────────────────────────

test("createAvatarRealtimeSession: POST path, auth, body, decode", async () => {
  const { client, captured } = mockClient(200, {
    stream_id: "rt_9f2c1a",
    status: "pending",
    prepaid_seconds: 300,
    cost_ticks: 345000000000,
    request_id: "req_abc123def456",
  });

  const resp = await client.createAvatarRealtimeSession({
    type: "text_stream",
    avatar_id: "Abigail_expressive_2024112501",
    voice_id: "73c0b6a2e29d4d38aca41454bf58c955",
    text: "Hello! Let me think about that...",
    max_duration_seconds: 300,
  });

  assert.equal(captured.method, "POST");
  assert.equal(
    captured.url,
    "https://api.quantumencoding.ai/qai/v1/avatar/realtime",
  );
  assert.equal(captured.headers["Authorization"], `Bearer ${API_KEY}`);
  assert.equal(captured.headers["Content-Type"], "application/json");
  assert.ok(captured.headers["Idempotency-Key"], "mutating call carries an Idempotency-Key");

  assert.deepEqual(captured.body, {
    type: "text_stream",
    avatar_id: "Abigail_expressive_2024112501",
    voice_id: "73c0b6a2e29d4d38aca41454bf58c955",
    text: "Hello! Let me think about that...",
    max_duration_seconds: 300,
  });

  assert.equal(resp.stream_id, "rt_9f2c1a");
  assert.equal(resp.status, "pending");
  assert.equal(resp.prepaid_seconds, 300);
  assert.equal(resp.cost_ticks, 345000000000);
  assert.equal(resp.request_id, "req_abc123def456");
});

test("createAvatarRealtimeSession: backfills cost/balance/request_id from headers", async () => {
  const { client } = mockClient(
    200,
    {
      stream_id: "rt_1",
      status: "pending",
      prepaid_seconds: 60,
      cost_ticks: 0,
      request_id: "",
    },
    {
      "X-QAI-Cost-Ticks": "69000000000",
      "X-QAI-Balance-After": "1000000000000",
      "X-QAI-Request-Id": "req_from_header",
    },
  );

  const resp = await client.createAvatarRealtimeSession({
    type: "tts",
    avatar_id: "av_1",
    voice_id: "v_1",
    text: "Hi",
    max_duration_seconds: 60,
  });

  assert.equal(resp.cost_ticks, 69000000000);
  assert.equal(resp.balance_after, 1000000000000);
  assert.equal(resp.request_id, "req_from_header");
});

test("createAvatarRealtimeSession: audio union serialized, tts fields omitted", async () => {
  const { client, captured } = mockClient(200, {
    stream_id: "rt_2",
    status: "pending",
    prepaid_seconds: 120,
    cost_ticks: 1,
    request_id: "req_x",
  });

  await client.createAvatarRealtimeSession({
    type: "audio",
    avatar_id: "av_1",
    audio: { type: "base64", media_type: "audio/mpeg", data: "AQID" },
    max_duration_seconds: 120,
  });

  const body = captured.body as Record<string, unknown>;
  assert.equal(body.type, "audio");
  assert.ok(!("voice_id" in body), "voice_id must be omitted for audio sessions");
  assert.ok(!("text" in body), "text must be omitted for audio sessions");
  assert.deepEqual(body.audio, {
    type: "base64",
    media_type: "audio/mpeg",
    data: "AQID",
  });
});

test("getAvatarRealtimeSession: GET path + decode optional fields", async () => {
  const { client, captured } = mockClient(200, {
    stream_id: "rt_9f2c1a",
    status: "streaming",
    hls_url: "https://cdn.heygen.com/realtime/rt_9f2c1a/index.m3u8",
    request_id: "req_abc123def457",
  });

  const resp = await client.getAvatarRealtimeSession("rt_9f2c1a");

  assert.equal(captured.method, "GET");
  assert.equal(
    captured.url,
    "https://api.quantumencoding.ai/qai/v1/avatar/realtime/rt_9f2c1a",
  );
  assert.equal(captured.headers["Authorization"], `Bearer ${API_KEY}`);
  assert.equal(captured.body, undefined);

  assert.equal(resp.status, "streaming");
  assert.equal(resp.hls_url, "https://cdn.heygen.com/realtime/rt_9f2c1a/index.m3u8");
  assert.equal(resp.error_message, undefined);
  assert.equal(resp.end_reason, undefined);
});

test("sendAvatarRealtimeText: delta append", async () => {
  const { client, captured } = mockClient(200, {
    ok: true,
    buffered_bytes: 512,
    final: false,
    request_id: "req_abc123def458",
  });

  const resp = await client.sendAvatarRealtimeText("rt_9f2c1a", {
    delta: " and here is the rest.",
  });

  assert.equal(captured.method, "POST");
  assert.equal(
    captured.url,
    "https://api.quantumencoding.ai/qai/v1/avatar/realtime/rt_9f2c1a/text",
  );
  assert.deepEqual(captured.body, {
    delta: " and here is the rest.",
    final: false,
  });

  assert.equal(resp.ok, true);
  assert.equal(resp.buffered_bytes, 512);
  assert.equal(resp.final, false);
});

test("sendAvatarRealtimeText: final marker omits empty delta", async () => {
  const { client, captured } = mockClient(200, {
    ok: true,
    buffered_bytes: 512,
    final: true,
    request_id: "req_1",
  });

  const resp = await client.sendAvatarRealtimeText("rt_9f2c1a", { final: true });

  assert.deepEqual(captured.body, { final: true });
  assert.equal(resp.final, true);
});

test("cancelAvatarRealtimeSession: POST cancel with no body", async () => {
  const { client, captured } = mockClient(200, {
    stream_id: "rt_9f2c1a",
    cancelled: true,
    request_id: "req_abc123def459",
  });

  const resp = await client.cancelAvatarRealtimeSession("rt_9f2c1a");

  assert.equal(captured.method, "POST");
  assert.equal(
    captured.url,
    "https://api.quantumencoding.ai/qai/v1/avatar/realtime/rt_9f2c1a/cancel",
  );
  assert.equal(captured.body, undefined);

  assert.equal(resp.stream_id, "rt_9f2c1a");
  assert.equal(resp.cancelled, true);
});

// ── Audio sounds search ─────────────────────────────────────────────

test("searchAudioSounds: full query string + decode", async () => {
  const { client, captured } = mockClient(200, {
    sounds: [
      {
        id: "trk_8842aa",
        name: "Uplifting Corporate",
        description: "Bright, optimistic corporate track",
        audio_url: "https://resource.heygen.ai/sounds/trk_8842aa.wav?sig=x",
        duration: 94.5,
        score: 0.91,
        type: "music",
      },
    ],
    has_more: true,
    next_token: "eyJvZmZzZXQiOjEwfQ",
    request_id: "req_abc123def45a",
  });

  const resp = await client.searchAudioSounds({
    query: "calm piano",
    type: "music",
    limit: 10,
    min_score: 0,
    token: "tok en",
  });

  assert.equal(captured.method, "GET");
  const url = new URL(captured.url);
  assert.equal(url.pathname, "/qai/v1/audio/sounds");
  assert.equal(url.searchParams.get("query"), "calm piano");
  assert.equal(url.searchParams.get("type"), "music");
  assert.equal(url.searchParams.get("limit"), "10");
  assert.equal(url.searchParams.get("min_score"), "0", "min_score 0 must not be dropped");
  assert.equal(url.searchParams.get("token"), "tok en");

  assert.equal(resp.sounds.length, 1);
  assert.equal(resp.sounds[0]!.id, "trk_8842aa");
  assert.equal(resp.sounds[0]!.duration, 94.5);
  assert.equal(resp.sounds[0]!.score, 0.91);
  assert.equal(resp.sounds[0]!.type, "music");
  assert.equal(resp.has_more, true);
  assert.equal(resp.next_token, "eyJvZmZzZXQiOjEwfQ");
});

test("searchAudioSounds: minimal query sends only `query`", async () => {
  const { client, captured } = mockClient(200, {
    sounds: [],
    has_more: false,
    next_token: "",
    request_id: "req_1",
  });

  const resp = await client.searchAudioSounds({ query: "rain" });

  const url = new URL(captured.url);
  assert.deepEqual([...url.searchParams.keys()], ["query"]);
  assert.equal(url.searchParams.get("query"), "rain");
  assert.deepEqual(resp.sounds, []);
});

// ── Video template v3 ───────────────────────────────────────────────

test("videoTemplateDetail: GET path + decode variables/scenes", async () => {
  const { client, captured } = mockClient(200, {
    template: {
      id: "tmpl_5f0a",
      name: "Product Launch",
      aspect_ratio: "16:9",
      variables: {
        headline: { type: "text", content: "Default headline" },
        presenter: {
          type: "character",
          character_id: "Abigail_expressive_2024112501",
          character_type: "avatar",
        },
      },
      scenes: [
        {
          scene_id: "scene_1",
          script: "Introducing {{headline}}...",
          variables: [{ name: "headline", variable_type: "text" }],
        },
      ],
    },
    request_id: "req_abc123def45b",
  });

  const resp = await client.videoTemplateDetail("tmpl_5f0a");

  assert.equal(captured.method, "GET");
  assert.equal(
    captured.url,
    "https://api.quantumencoding.ai/qai/v1/video/template/tmpl_5f0a",
  );

  assert.equal(resp.template.id, "tmpl_5f0a");
  assert.equal(resp.template.aspect_ratio, "16:9");
  assert.deepEqual(resp.template.variables.headline, {
    type: "text",
    content: "Default headline",
  });
  assert.equal(resp.template.scenes.length, 1);
  assert.equal(resp.template.scenes[0]!.scene_id, "scene_1");
  assert.equal(resp.template.scenes[0]!.variables[0]!.variable_type, "text");
});

test("videoTemplateGenerate: POST 202 accepted-job envelope", async () => {
  const { client, captured } = mockClient(202, {
    job_id: "qai_job_3def45c00112",
    status: "pending",
    type: "video/template-v3",
    request_id: "req_abc123def45c",
  });

  const resp = await client.videoTemplateGenerate("tmpl_5f0a", {
    variables: { headline: { type: "text", content: "Cosmic Duck 2.0" } },
    title: "Launch video",
    scene_ids: ["scene_1", "scene_1"],
    dimension: { width: 1920, height: 1080 },
    fps: 30,
    caption: true,
    subtitles: { preset_name: "classic", alignment: 2 },
  });

  assert.equal(captured.method, "POST");
  assert.equal(
    captured.url,
    "https://api.quantumencoding.ai/qai/v1/video/template/tmpl_5f0a",
  );
  assert.ok(captured.headers["Idempotency-Key"]);
  assert.deepEqual(captured.body, {
    variables: { headline: { type: "text", content: "Cosmic Duck 2.0" } },
    title: "Launch video",
    scene_ids: ["scene_1", "scene_1"],
    dimension: { width: 1920, height: 1080 },
    fps: 30,
    caption: true,
    subtitles: { preset_name: "classic", alignment: 2 },
  });

  assert.equal(resp.job_id, "qai_job_3def45c00112");
  assert.equal(resp.status, "pending");
  assert.equal(resp.type, "video/template-v3");
  assert.equal(resp.request_id, "req_abc123def45c");
});

test("videoTemplateGenerate: optional fields omitted from body", async () => {
  const { client, captured } = mockClient(202, {
    job_id: "qai_job_1",
    status: "pending",
    type: "video/template-v3",
    request_id: "req_1",
  });

  await client.videoTemplateGenerate("tmpl_1", {
    variables: { headline: { type: "text", content: "x" } },
  });

  assert.deepEqual(captured.body, {
    variables: { headline: { type: "text", content: "x" } },
  });
});

// ── Video batch ─────────────────────────────────────────────────────

test("videoBatchSubmit: POST 202 + opaque payload passthrough", async () => {
  const { client, captured } = mockClient(202, {
    batch_id: "batch_66aa1c",
    status: "processing",
    total_items: 2,
    request_id: "req_abc123def45d",
  });

  const videos = [
    {
      type: "avatar",
      avatar_id: "Abigail_expressive_2024112501",
      voice_id: "73c0b6a2",
      script: "Welcome to the team!",
    },
    {
      type: "cinematic_avatar",
      avatar_id: ["look_1", "look_2"],
      script: "Here is how billing works.",
    },
  ];

  const resp = await client.videoBatchSubmit({
    title: "Onboarding videos",
    videos,
  });

  assert.equal(captured.method, "POST");
  assert.equal(
    captured.url,
    "https://api.quantumencoding.ai/qai/v1/video/batch",
  );
  assert.deepEqual(captured.body, { title: "Onboarding videos", videos });

  assert.equal(resp.batch_id, "batch_66aa1c");
  assert.equal(resp.status, "processing");
  assert.equal(resp.total_items, 2);
});

test("videoBatchStatus: GET with limit/token + settled decode", async () => {
  const { client, captured } = mockClient(200, {
    batch_id: "batch_66aa1c",
    title: "Onboarding videos",
    status: "completed",
    total_items: 3,
    counts_by_status: { completed: 2, failed: 1 },
    created_at: 1752741600,
    items: [
      {
        item_index: 0,
        status: "completed",
        video_id: "vid_001",
        video_url: "https://resource.heygen.ai/video/vid_001.mp4?sig=x",
      },
      {
        item_index: 2,
        status: "failed",
        error: { code: "avatar_not_found", message: "avatar id not found" },
      },
    ],
    has_more: false,
    next_token: "",
    billing_status: "settled",
    cost_ticks: 46000000000,
    request_id: "req_abc123def45e",
  });

  const resp = await client.videoBatchStatus("batch_66aa1c", {
    limit: 50,
    token: "cursor1",
  });

  assert.equal(captured.method, "GET");
  const url = new URL(captured.url);
  assert.equal(url.pathname, "/qai/v1/video/batch/batch_66aa1c");
  assert.equal(url.searchParams.get("limit"), "50");
  assert.equal(url.searchParams.get("token"), "cursor1");

  assert.equal(resp.status, "completed");
  assert.equal(resp.billing_status, "settled");
  assert.equal(resp.cost_ticks, 46000000000);
  assert.equal(resp.created_at, 1752741600);
  assert.deepEqual(resp.counts_by_status, { completed: 2, failed: 1 });
  assert.equal(resp.items.length, 2);
  assert.equal(resp.items[0]!.video_url, "https://resource.heygen.ai/video/vid_001.mp4?sig=x");
  assert.equal(resp.items[1]!.error!.code, "avatar_not_found");
  assert.equal(resp.items[1]!.video_url, undefined);
});

test("videoBatchStatus: no query params → bare path", async () => {
  const { client, captured } = mockClient(200, {
    batch_id: "batch_1",
    title: "",
    status: "processing",
    total_items: 1,
    counts_by_status: { processing: 1 },
    created_at: 1752741600,
    items: [{ item_index: 0, status: "processing" }],
    has_more: false,
    next_token: "",
    billing_status: "unsettled",
    cost_ticks: 0,
    request_id: "req_1",
  });

  const resp = await client.videoBatchStatus("batch_1");

  assert.equal(
    captured.url,
    "https://api.quantumencoding.ai/qai/v1/video/batch/batch_1",
  );
  assert.equal(resp.billing_status, "unsettled");
  assert.equal(resp.items[0]!.video_url, undefined, "URLs withheld until settled");
});

// ── Error envelope handling ─────────────────────────────────────────

test("402 INSUFFICIENT_BALANCE surfaces as APIError (no retry)", async () => {
  const { client, captured } = mockClient(402, {
    error: {
      message: "out of credits — top up to continue",
      type: "insufficient_balance",
      code: "INSUFFICIENT_BALANCE",
    },
  });

  await assert.rejects(
    client.videoBatchSubmit({ videos: [{ type: "avatar" }] }),
    (err: unknown) => {
      assert.ok(err instanceof APIError);
      assert.equal(err.statusCode, 402);
      assert.equal(err.code, "INSUFFICIENT_BALANCE");
      assert.ok(err.isInsufficientBalance());
      return true;
    },
  );
  assert.equal(captured.calls, 1, "4xx must not be retried");
});

test("404 not_found on ownership miss surfaces as APIError", async () => {
  const { client } = mockClient(404, {
    error: {
      message: "batch batch_x not found",
      type: "not_found",
      code: "not_found",
    },
  });

  await assert.rejects(client.videoBatchStatus("batch_x"), (err: unknown) => {
    assert.ok(err instanceof APIError);
    assert.ok(err.isNotFound());
    return true;
  });
});

test("upstream 410 provider_error passthrough (closed text stream)", async () => {
  const { client } = mockClient(410, {
    error: {
      message: "text stream already closed",
      type: "provider_error",
      code: "provider_error",
    },
  });

  await assert.rejects(
    client.sendAvatarRealtimeText("rt_1", { delta: "late" }),
    (err: unknown) => {
      assert.ok(err instanceof APIError);
      assert.equal(err.statusCode, 410);
      assert.equal(err.code, "provider_error");
      return true;
    },
  );
});
