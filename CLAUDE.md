# quantum-sdk-ts

## SDK Parity Check

This SDK must stay in sync with the Rust reference SDK. Use `sdk-graph` to check parity:

```bash
# Scan this SDK (run after making changes)
sdk-graph scan --sdk ts --dir ~/work/poly-repo/quantum-ai-polyrepo/qe-sdk-collection/npm_projects/quantum-sdk/src

# Scan Rust reference (if not recently scanned)
sdk-graph scan --sdk rust --dir ~/work/poly-repo/quantum-ai-polyrepo/qe-sdk-collection/rust_projects/quantum-sdk/src

# Show what this SDK is missing vs Rust
sdk-graph diff --base rust --target ts

# Show overall stats
sdk-graph stats
```

Binary: `~/go/bin/sdk-graph` (in PATH)
Graph file: `~/work/poly-repo/quantum-ai-polyrepo/quantum-ai-backend/sdk-graph.json` (shared across all SDKs)

## Workflow

1. Before starting work: run `sdk-graph diff --base rust --target ts` to see current gaps
2. After adding types/fields: rescan with `sdk-graph scan --sdk ts --dir ~/work/poly-repo/quantum-ai-polyrepo/qe-sdk-collection/npm_projects/quantum-sdk/src`
3. Verify gap reduced: run diff again
4. Goal: zero missing types and fields vs Rust

## Reference Implementation

The Rust SDK is the source of truth: `~/work/poly-repo/quantum-ai-polyrepo/qe-sdk-collection/rust_projects/quantum-sdk/src/`

When adding missing types, follow the Rust SDK's field names and JSON serialization tags exactly. Map types idiomatically:
- Rust `Option<T>` -> TS `T | undefined` or `T?`
- Rust `Vec<T>` -> TS `T[]`
- Rust `String` -> TS `string`
- Rust serde rename -> TS interface field names

## API Server

Backend: https://api.quantumencoding.ai
Repo: ~/work/poly-repo/quantum-ai-polyrepo/quantum-ai-backend
