# @paladinshield/rel-core

**Status: Phase 3 — post-submit hackathon addition (2026-05-19). Not production-ready. Not scored.**

This folder is **reference scaffolding** for wallet-native REL, added **after** the Colosseum submission. Judges: evaluate **`src/extension/`** only. Exploring this package is optional.

## For reviewers

- **Score this:** `src/extension/` (load unpacked in Chrome).
- **This package:** optional preview of wallet-native direction — same policy *contract* as the extension, not a finished SDK.

Local heuristics are canonical in `src/extension/scripts/policy-heuristics.js`; this package re-exports them to prevent drift.

## Optional checks (Node 18+, post-submit curiosity only)

From repository root:

```bash
npm test
node packages/rel-core/examples/wallet-shell.mjs
node packages/rel-core/examples/smoke.mjs
```

Browser demo (static server): `npx serve packages/rel-core/examples -p 3456` → `/browser-demo.html`

## Documentation

- Roadmap & scope: [docs/SDK_ROADMAP.md](../../docs/SDK_ROADMAP.md)
- Integration sketch: [docs/WALLET_SDK_INTEGRATION.md](../../docs/WALLET_SDK_INTEGRATION.md)
- Wallet pilot (generic): [docs/WALLET_PILOT.md](../../docs/WALLET_PILOT.md)
- Threat model: [docs/THREAT_MODEL.md](../../docs/THREAT_MODEL.md)
