import {
  QuantumClient,
  responseText,
  userMessage,
} from "../src/index.js";

const apiKey = process.env["QAI_API_KEY"];
if (!apiKey) {
  console.error("Set QAI_API_KEY environment variable");
  process.exit(1);
}

const client = new QuantumClient(apiKey);

// ── Non-streaming chat ──────────────────────────────────────────────

console.log("=== Non-streaming ===\n");

const resp = await client.chat({
  model: "claude-sonnet-4-6",
  messages: [userMessage("What is quantum computing in one sentence?")],
});

console.log("Model:", resp.model);
console.log("Text:", responseText(resp));
console.log("Usage:", resp.usage);
console.log("Cost ticks:", resp.cost_ticks);
console.log();

// ── Streaming chat ──────────────────────────────────────────────────

console.log("=== Streaming ===\n");

process.stdout.write("Response: ");
for await (const event of client.chatStream({
  model: "gpt-5-mini",
  messages: [userMessage("Write a haiku about TypeScript.")],
})) {
  if (event.delta?.text) {
    process.stdout.write(event.delta.text);
  }
  if (event.usage) {
    console.log("\n\nUsage:", event.usage);
  }
}
console.log();
