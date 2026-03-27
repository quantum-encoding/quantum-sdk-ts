# @quantum-encoding/quantum-sdk

TypeScript client SDK for the [Quantum AI API](https://api.quantumencoding.ai).

```bash
npm install @quantum-encoding/quantum-sdk
```

## Quick Start

```typescript
import { QuantumClient } from "@quantum-encoding/quantum-sdk";

const client = new QuantumClient("qai_k_your_key_here");
const response = await client.chat("gemini-2.5-flash", "Hello! What is quantum computing?");
console.log(response.text);
```

## Features

- 110+ endpoints across 10 AI providers and 45+ models
- TypeScript-first with full type definitions
- ESM + CommonJS dual package
- Streaming via async iterators
- Agent orchestration with SSE event streams
- GPU/CPU compute rental
- Batch processing (50% discount)
- Tree-shakeable exports

## Examples

### Chat Completion

```typescript
import { QuantumClient } from "@quantum-encoding/quantum-sdk";

const client = new QuantumClient("qai_k_your_key_here");

const response = await client.chat({
  model: "claude-sonnet-4-6",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Explain closures in JavaScript" },
  ],
  temperature: 0.7,
  maxTokens: 1000,
});

console.log(response.text);
```

### Streaming

```typescript
const stream = client.chatStream({
  model: "claude-sonnet-4-6",
  messages: [{ role: "user", content: "Write a haiku about TypeScript" }],
});

for await (const event of stream) {
  if (event.deltaText) {
    process.stdout.write(event.deltaText);
  }
}
```

### Image Generation

```typescript
const images = await client.generateImage("grok-imagine-image", "A cosmic duck in space");
for (const image of images.images) {
  console.log(image.url ?? "base64");
}
```

### Text-to-Speech

```typescript
const audio = await client.speak("Welcome to Quantum AI!", "alloy", "mp3");
console.log(audio.audioUrl);
```

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
| Compute | 7 | GPU/CPU rental |
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
| **TypeScript** | @quantum-encoding/quantum-sdk | `npm i @quantum-encoding/quantum-sdk` |
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
