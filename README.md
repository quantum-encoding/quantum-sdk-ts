# quantum-ai-sdk

TypeScript client SDK for the [Quantum AI API](https://api.quantumencoding.ai).

```bash
npm install quantum-ai-sdk
```

## Quick Start

```typescript
import { QuantumClient, responseText } from "quantum-ai-sdk";

const client = new QuantumClient("qai_k_your_key_here");
const response = await client.chat({
  model: "qwen3.8-max",
  messages: [{ role: "user", content: "Hello! What is quantum computing?" }],
});
console.log(responseText(response));
```

## Features

- 110+ endpoints across 11 AI providers and 50+ models
- TypeScript-first with full type definitions
- ESM package (Node 20+; `package.json` is `"type": "module"`, tsc emits ESM only — no CommonJS build)
- Streaming via async iterators
- Agent orchestration with SSE event streams
- GPU/CPU compute rental (requires per-account admin approval)
- Batch processing (50% discount)
- Tree-shakeable exports

## Examples

### Chat Completion

```typescript
import { QuantumClient, responseText } from "quantum-ai-sdk";

const client = new QuantumClient("qai_k_your_key_here");

const response = await client.chat({
  model: "claude-opus-4-8",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain closures in JavaScript" },
  ],
  temperature: 0.7,
  max_tokens: 1000,
});

console.log(responseText(response));
```

### Qwen (Alibaba Model Studio)

Hybrid-thinking Qwen models stream their chain of thought alongside the
answer. `reasoning_effort` maps onto Qwen's `enable_thinking` — `"none"`
switches thinking off (cheaper, faster); omit it for the model default.
Lineup: `qwen3.8-max`, `qwen3.7-plus`, `qwen3.6-flash`, `qwen-turbo`,
`qwen3-coder-plus`, `qwen3-coder-flash`, `qwen-vl-max` (vision).

```typescript
import { QuantumClient, responseText, responseThinking } from "quantum-ai-sdk";

const client = new QuantumClient("qai_k_your_key_here");

const response = await client.chat({
  model: "qwen3.8-max",
  messages: [{ role: "user", content: "Plan a migration from REST to gRPC" }],
  reasoning_effort: "high",
});

console.log("thinking:", responseThinking(response));
console.log("answer:", responseText(response));
```

### Streaming

```typescript
const stream = client.chatStream({
  model: "claude-opus-4-8",
  messages: [{ role: "user", content: "Write a haiku about TypeScript" }],
});

for await (const event of stream) {
  if (event.event_type === "content_delta" && event.delta) {
    process.stdout.write(event.delta.text);
  }
}
```

### Reasoning state across a tool loop

Reasoning models on the OpenAI and xAI lanes mint a `reasoning` content block
alongside their `tool_use` blocks. It is the provider's own state, opaque, and
it must go back **unchanged and in the same position** on the next turn's
assistant message — its place among the tool calls is how the provider learns
where the reasoning sat. Drop it and the reasoning tokens are re-billed on
every round of the loop.

The simplest correct thing is to hand the whole `content` array back:

```typescript
const messages: ChatMessage[] = [
  { role: "user", content: "What is the weather in Oslo?" },
];

const res = await client.chat({
  model: "gpt-5.6",
  messages,
  // One key per conversation, reused on every turn, so all of them land on
  // the same warm provider cache shard.
  prompt_cache_key: "conv-7f3a",
});

// Verbatim, in order: reasoning blocks, tool_use blocks, text blocks.
messages.push({ role: "assistant", content_blocks: res.content });
// ... then push one tool-result message per tool_use block and loop.
```

`ContentBlock.reasoning` is typed `unknown` on purpose — it is the provider's
item, not ours. A `thinking` block is the human-readable summary of the same
turn: render that one, replay this one.

On Gemini 3 the equivalent state is `ContentBlock.thought_signature`, and it
now rides the **text** block of a turn that ended in text as well as the
`tool_use` blocks. Streaming delivers it as a `thought_signature` event just
before `done`, on `StreamEvent.thought_signature`.

### Provider options

`provider_options` is an open map, so a key the gateway documents but this SDK
version does not name still rides through — as does the flat `region` entry:

```typescript
await client.chat({
  model: "gpt-5.6",
  messages,
  provider_options: {
    openai: {
      reasoning_summary: "detailed",  // auto | concise | detailed | none
      reasoning_mode: "pro",          // standard | pro
      verbosity: "low",               // low | medium | high
      text_format: "json_object",     // text | json_object
    },
    xai: { native_files: true },
    region: "europe",                 // americas | europe | asia
  },
});
```

`reasoning_effort` accepts `none`, `low`, `medium`, `high`, `xhigh` and `max` on
every lane; each adapter folds a tier its model lacks onto the nearest one.

### Image Generation

```typescript
const images = await client.generateImage("grok-imagine-image", "A cosmic duck in space");
for (const image of images.images) {
  console.log(image.url ?? "base64");
}
```

### Text-to-Speech

```typescript
const audio = await client.speak({
  model: "gpt-4o-mini-tts",
  text: "Welcome to Quantum AI!",
  voice: "alloy",
  format: "mp3",
});
// The audio arrives inline, base64-encoded — there is no URL to fetch.
console.log(`${audio.size_bytes} bytes of ${audio.format}`);
```

### Steering a Gemini voice

The gateway's house voice is **Gemini 3.1 Flash TTS**
(`gemini-3.1-flash-tts-preview`) with the **Laomedeia** voice; both apply when
the request names neither, so `text` alone is a complete request.

Gemini has no knobs for tone, accent or pace. You steer it in prose — with
`instructions` for the whole read, and with inline tags inside `text` for
moment-to-moment inflection.

```typescript
const audio = await client.speak({
  // No model: the gateway supplies Gemini 3.1 Flash TTS + Laomedeia.
  text: "Hi, this is Lacey from CRG Direct. [warmly] How can I help today?",
  instructions:
    "Read aloud as a friendly, professional customer-service assistant " +
    "with a natural British accent, at a natural easy pace",
  language: "en-GB",
});
```

`instructions` carries tone and character ("like telling a friend about
something you love"), accent ("with a natural British accent" — pair it with
`language` so the pronunciation family matches), and pace ("slow down on the
phone number"). Spell digits with separators — `0-1-2-3, 4-5-6` — to have them
read one at a time.

**Inline tags** go in the text itself: `[amazed] [crying] [curious] [excited]
[sighs] [gasp] [giggles] [laughs] [mischievously] [panicked] [sarcastic]
[serious] [shouting] [tired] [trembling] [whispers]`, plus free-form ones like
`[like a cartoon dog]`.

**Two-speaker dialogue** replaces `voice` with `speakers`. Exactly two — the
gateway rejects any other count with a 400 — and the text carries each
speaker's lines under the matching label:

```typescript
const audio = await client.speak({
  text:
    "Lacey: Hi, this is Lacey from CRG Direct. How can I help?\n" +
    "Customer: [excited] Hi! I'm calling about Tuesday's installation.",
  instructions: "Lacey is calm and professional; the customer is cheerful",
  speakers: [
    { name: "Lacey", voice: "Laomedeia" },
    { name: "Customer", voice: "Puck" },
  ],
});
```

All 30 Gemini prebuilt voices (Zephyr, Puck, Charon, Kore, Laomedeia,
Sulafat, …) work on every Gemini TTS model. `client.listVoices()` returns the
catalogue with each voice's `provider` and the `model` to pass back for it, so
a picker never hardcodes the provider-to-model mapping.

Limits: 32k-token session context, two speakers maximum, and quality drifts
past a few minutes of audio — split long scripts.

`speed`, `sample_rate` and `bit_rate` are xAI-only; `voice_settings` is
ElevenLabs-only. On Gemini, ask for pace in `instructions` instead.

### Web Search

```typescript
const results = await client.webSearch("latest TypeScript releases 2026");
for (const result of results.results) {
  console.log(`${result.title}: ${result.url}`);
}
```

### Agent Orchestration

```typescript
const stream = client.agentRun("Research quantum computing breakthroughs");
for await (const event of stream) {
  switch (event.type) {
    case "content_delta":
      process.stdout.write(event.content ?? "");
      break;
    case "done":
      console.log("\n--- Done ---");
      break;
  }
}
```

## All Endpoints

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Chat | 2 | Text generation + session chat |
| Agent | 2 | Multi-step orchestration + missions |
| Images | 2 | Generation + editing |
| Video | 7 | Generation, studio, translation, avatars |
| Audio | 13 | TTS, STT, music, dialogue, dubbing, voice design |
| Voices | 5 | Clone, list, delete, library, design |
| Embeddings | 1 | Text embeddings |
| RAG | 4 | Vertex AI + SurrealDB search |
| Documents | 3 | Extract, chunk, process |
| Search | 3 | Web search, context, answers |
| Scanner | 11 | Code scanning, type queries, diffs |
| Scraper | 2 | Doc scraping + screenshots |
| Jobs | 3 | Async job management |
| Compute | 7 | GPU/CPU rental (admin-approved accounts only) |
| Keys | 3 | API key management |
| Account | 3 | Balance, usage, summary |
| Credits | 6 | Packs, tiers, lifetime, purchase |
| Batch | 4 | 50% discount batch processing |
| Realtime | 3 | Voice sessions |
| Models | 2 | Model list + pricing |

## Authentication

Pass your API key when creating the client:

```typescript
const client = new QuantumClient("qai_k_your_key_here");
```

The SDK sends it as the `X-API-Key` header. Both `qai_...` (primary) and `qai_k_...` (scoped) keys are supported. You can also use `Authorization: Bearer <key>`.

Get your API key at [cosmicduck.dev](https://cosmicduck.dev).

## Pricing

See [api.quantumencoding.ai/pricing](https://api.quantumencoding.ai/pricing) for current rates.

The **Lifetime tier** offers 0% margin at-cost pricing via a one-time payment.

## Other SDKs

All SDKs are at v0.4.0 with type parity verified by scanner.

| Language | Package | Install |
|----------|---------|---------|
| Rust | quantum-sdk | `cargo add quantum-sdk` |
| Go | quantum-sdk | `go get github.com/quantum-encoding/quantum-sdk` |
| **TypeScript** | quantum-ai-sdk | `npm i quantum-ai-sdk` |
| Python | quantum-sdk | `pip install quantum-sdk` |
| Swift | QuantumSDK | Swift Package Manager |
| Kotlin | quantum-sdk | Gradle dependency |

MCP server: `npx @quantum-encoding/ai-conductor-mcp`

## API Reference

- Interactive docs: [api.quantumencoding.ai/docs](https://api.quantumencoding.ai/docs)
- OpenAPI spec: [api.quantumencoding.ai/openapi.yaml](https://api.quantumencoding.ai/openapi.yaml)
- LLM context: [api.quantumencoding.ai/llms.txt](https://api.quantumencoding.ai/llms.txt)

## License

MIT
