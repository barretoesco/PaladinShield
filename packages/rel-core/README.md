# @paladinshield/rel-core

**Status: Phase 3 roadmap — in development (not production-ready).**

This folder is **reference scaffolding** for a future wallet-embeddable REL. It is **not** part of the hackathon demo path.

## For reviewers

- **Judge the extension:** `src/extension/` (load unpacked in Chrome).
- **This package:** optional API preview only — same policy *contract* as `translator.js`, not a finished SDK.

## Optional smoke check (Node 18+)

From repository root:

```bash
node packages/rel-core/examples/smoke.mjs
```

Expected: heuristic verdict object, `Critical: true`, forensic hash prefix — confirms local modules load; **not** a wallet integration test.

## Documentation

Full context: [docs/WALLET_SDK_INTEGRATION.md](../../docs/WALLET_SDK_INTEGRATION.md)
