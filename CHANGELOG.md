# Changelog

## 0.9.0

The TTS request catches up with the gateway — and the TTS *response* stops
describing a payload the endpoint has never sent.

### Fixed — BREAKING, but nothing working can break
- **`TTSResponse` declared the wrong shape.** It was
  `{ audio_url, format, duration_seconds, request_id, cost_ticks }`.
  `POST /qai/v1/audio/tts` returns `{ audio_base64, format, size_bytes, model,
  cost_ticks, balance_after, request_id, provenance }` and has never sent
  `audio_url` or `duration_seconds` — the string `audio_url` does not appear
  anywhere in the gateway's TTS path. So `speak()` was typed to hand back
  `undefined` for the audio, and the audio that did arrive was unreachable
  without casting away the type.

  Any code reading `audio_url` was reading `undefined` at runtime, so this
  cannot break a working caller — it only stops the compiler from endorsing
  the bug.

- **`TtsRequest` / `TtsResponse` were a second, divergent declaration** of the
  same two types — unexported, unreferenced, and naming the format field
  `output_format`, a key the handler does not read, so a request built from
  that shape lost its format silently. Both are now aliases of `TTSRequest` /
  `TTSResponse`, leaving one TTS shape in the SDK.

### Added
- `TTSRequest.instructions` — style direction: tone, pace, accent, character.
  On Gemini it is prepended to the prompt and is the main way to steer a read,
  since Gemini exposes no knobs for any of it. On OpenAI only `gpt-4o-mini-tts`
  honours it; `tts-1`/`tts-1-hd` reject the field and the gateway drops it.
- `TTSRequest.language` — BCP-47 tag (`en-GB`, `es-ES`, `auto`). Gemini detects
  the language on its own; set this to pin the pronunciation or accent family.
  Also drives xAI pronunciation, where an English default sounds robotic on
  other languages.
- `TTSRequest.sample_rate` and `.bit_rate` — Hz and bits/sec, xAI only.
- `TTSRequest.voice_settings` and the new `TTSVoiceSettings` (`stability`,
  `similarity_boost`, `style`, `use_speaker_boost`). ElevenLabs only. Every
  field is optional: an absent knob leaves the provider default alone, and 0.0
  stability is a real setting, so a zeroed object would silently retune the
  voice.
- `TTSRequest.speakers` and the new `TTSSpeaker` (`name`, `voice`) — Gemini
  two-voice dialogue. Each entry pairs a speaker label used in `text`
  ("Lacey: …") with the prebuilt voice that reads it. Exactly two; the gateway
  rejects any other count with a 400, and `voice` is then ignored.
- `VoiceInfo.category`, `.model`, `.is_cloned` and `.description`, plus
  `VoicesResponse.request_id`. `GET /qai/v1/voices` has always sent these and
  this SDK typed only four of them, so a caller could not tell which model to
  pass back for a voice without hardcoding the provider mapping.
- `TTSSpeaker` and `TTSVoiceSettings` are exported from the package root.

### Docs
- README gains "Steering a Gemini voice", summarising the gateway's
  `docs/TTS_GUIDE.md`: `instructions` for tone/accent/pace, the inline audio
  tags (`[whispers]`, `[excited]`, …) that go inside `text`, two-speaker
  dialogue, the 30 Gemini prebuilt voices, and which fields are xAI- or
  ElevenLabs-only.
- The Text-to-Speech example is corrected: `speak()` takes a single
  `TTSRequest` object, not three positional arguments, and the audio arrives
  as `audio_base64`, not `audioUrl`.

Additive against an older gateway: the new request fields are simply absent.

## 0.8.0

The reasoning state a tool loop has to hand back, and the cache key that keeps a
conversation on one shard.

### Added
- `ChatRequest.prompt_cache_key` — any stable string the client keeps per
  conversation. The gateway hashes it with the caller's identity and forwards it
  as OpenAI/xAI `prompt_cache_key` (or `x-grok-conv-id` on the xAI
  chat-completions lane), so every turn of one conversation lands on the same
  warm provider cache shard. Omitted = derived from the caller's identity alone,
  which puts all of that user's conversations on one shard. Generate one per
  conversation object and reuse it on every turn.

  `POST /qai/v1/chat` only: the session endpoint derives its key from the
  session ID and ignores a client-supplied one.

- `ContentBlock.reasoning` and `ContentBlock.minted_by`, on blocks of the new
  type `"reasoning"`. This is the provider's own reasoning item, verbatim and
  opaque — typed `unknown` because it is the provider's shape, not ours. It
  arrives interleaved with the `tool_use` blocks and must be echoed back
  unchanged, **in the position it arrived in**, on the next turn's assistant
  message: its place among the tool calls is how the provider learns where the
  reasoning sat, and replaying it behind the call it reasoned about is a
  different conversation the provider rejects. Dropping it re-bills the
  reasoning tokens on every round of a tool loop.

  `minted_by` names the model that produced the block; reasoning state is bound
  to its model and is never replayed to a different one.

  Distinct from the existing `"thinking"` block, which is the human-readable
  summary of the same turn. One is for the reader, one is for the wire.

- `StreamEvent.thought_signature`, carried by the new `thought_signature` SSE
  event the gateway sends just before `done` on a Gemini 3 stream that ended in
  text, and by the atomic `tool_use` event — which a streaming tool loop
  previously had no way to read.

### Changed
- **`provider_options` is now `Record<string, unknown>`, widened from
  `Record<string, Record<string, unknown>>`** on both `ChatRequest` and
  `SessionChatRequest`. The old type could only express a nested object per
  provider, so the flat `provider_options.region` routing override did not
  typecheck at all and any non-object value a provider documents was
  unreachable. Assignments that already typechecked still do; code that
  *reads* a value now gets `unknown` and needs a cast.

  Newly documented keys: `openai.reasoning_summary`
  (`auto` | `concise` | `detailed` | `none`), `openai.reasoning_mode`
  (`standard` | `pro`), `openai.verbosity` (`low` | `medium` | `high`),
  `openai.text_format` (`text` | `json_object`), and `xai.native_files`
  (boolean).

- `ContentBlock.thought_signature` is documented on **text** blocks as well as
  `tool_use` blocks: Gemini 3 signs a turn that ends in text. The field already
  accepted it — this states the contract, it is not a shape change.
- `SessionChatRequest.reasoning_effort` documents `max`, which the gateway has
  always validated on every lane.

Additive against an older gateway: the new fields are simply absent.
