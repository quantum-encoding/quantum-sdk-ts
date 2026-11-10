// The client surface for gateway routes that do not exist, and the one
// photo-avatar body the gateway still accepts.
//
// The gateway answers 404 on the user batch, documents, search answer, HeyGen
// studio, compute billing and collection-documents routes (listed in
// CHANGELOG.md), so the client must not offer a method that can only fail. POST /qai/v1/video/photo-avatar takes the
// talking-photo body only: photo_base64 + script.
//
// Tests import the compiled dist/ output (the build runs first in the test
// script), matching what consumers of the package actually execute.

import { test } from "node:test";
import assert from "node:assert/strict";

import { QuantumClient } from "../dist/client.js";
import * as sdk from "../dist/index.js";
import * as rag from "../dist/rag.js";

const RETIRED_METHODS = [
  "batchSubmit",
  "batchSubmitJsonl",
  "batchJobs",
  "batchJob",
  "extractDocument",
  "chunkDocument",
  "processDocument",
  "searchAnswer",
  "videoStudio",
  "computeBilling",
];

test("the client offers no method for a retired route", () => {
  const client = new QuantumClient("qai_test_key");
  for (const name of RETIRED_METHODS) {
    assert.equal(
      (client as unknown as Record<string, unknown>)[name],
      undefined,
      `QuantumClient.${name} calls a route the gateway removed`,
    );
    assert.equal(
      (sdk as Record<string, unknown>)[name],
      undefined,
      `the package root exports ${name}`,
    );
  }
});

test("the rag module has no collection-documents function", () => {
  assert.equal(
    (rag as Record<string, unknown>).collectionsDocuments,
    undefined,
  );
});

test("videoPhotoAvatar sends the talking-photo body and decodes the job", async () => {
  let url = "";
  let method = "";
  let body: unknown;
  const fetchMock = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    url = String(input);
    method = init?.method ?? "GET";
    body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    return new Response(
      JSON.stringify({ job_id: "qai_job_abc", status: "pending", request_id: "req_1" }),
      { status: 202, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof globalThis.fetch;

  const client = new QuantumClient("qai_test_key", { fetch: fetchMock });
  const job = await client.videoPhotoAvatar({
    photo_base64: "aGVsbG8=",
    script: "Hello from a photo.",
    voice_id: "v_1",
  });

  assert.equal(method, "POST");
  assert.ok(url.endsWith("/qai/v1/video/photo-avatar"), url);
  assert.deepEqual(body, {
    photo_base64: "aGVsbG8=",
    script: "Hello from a photo.",
    voice_id: "v_1",
  });
  assert.equal(job.job_id, "qai_job_abc");
  assert.equal(job.status, "pending");
});
