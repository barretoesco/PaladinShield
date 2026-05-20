# Phase 3 — Wallet SDK (post-submit hackathon addition)

**Date:** 2026-05-19  
**Status:** Pilot-ready scaffold — **not submission scope**

> **Judges:** evaluate **`src/extension/`** only. Everything below was added **after** the Colosseum submission, for optional curiosity. Whether to look is entirely at your discretion — it is not offered as part of the scored deliverable.

## Why this exists

PaladinShield is a **Runtime Enforcement Layer (REL)** — middleware embeddable in wallet signing surfaces, not a wallet product. The MV3 extension is the Phase 1 proof that Promise gating works in the wild. Phase 3 documents the same enforcement primitives for wallet-native embedding.

## What this is

| Layer | Role |
|-------|------|
| `src/extension/` | **Submitted & shipped demo** — Promise gate, popup, OpenAI semantic path, Evidence Hub |
| `packages/rel-core/` | **Post-submit SDK** — policy, gate, intent normalization, forensic parity, token gate |
| `packages/rel-policy/` | **Stub** — mock/HTTP `policyEngine` adapters |

Local heuristics live in **`src/extension/scripts/policy-heuristics.js`** (canonical). SDK re-exports that module so extension and SDK cannot drift.

## Post-submit additions (complete pre–wallet-pilot)

| Date | Item | Notes |
|------|------|--------|
| 2026-05-19 | Unified `policy-heuristics.js` | Extension + SDK share one policy fast path |
| 2026-05-19 | `wallet-shell.mjs` A–D | Node gate demo |
| 2026-05-19 | **`rel-core` v0.3.x** | Forensic parity, decision-token helpers, browser demo |
| 2026-05-19 | **`rel-policy` v0.1.0** | Mock + HTTP remote policy stub |
| 2026-05-19 | **`rel-core` v0.4.x** | Intent normalizer, shadow mode, Integration Lab |
| 2026-05-19 | **`rel-core` v0.4.1** | `createRelGateWithTokens`, web3.js fixtures in lab |
| 2026-05-19 | Docs | `WALLET_PILOT`, `WALLET_LAB`, `THREAT_MODEL`, `WALLET_SDK_INTEGRATION` |

## Try it (Node 18+)

```bash
npm test
node packages/rel-core/examples/wallet-shell.mjs
node packages/rel-core/examples/wallet-with-tokens.mjs
node packages/rel-policy/examples/policy-hook-demo.mjs
npm run demo:browser
npm run demo:wallet-lab
```

Demos index: `http://localhost:3456/`

## Pilot-ready checklist (SDK)

| Capability | Status |
|------------|--------|
| Local policy + audit markers | ✅ |
| Promise gate (4 sign methods) | ✅ |
| Intent normalization (tx parsing) | ✅ |
| Shadow + enforce modes | ✅ |
| Decision-token gate (`createRelGateWithTokens`) | ✅ |
| Forensic hash parity | ✅ |
| Integration Lab (visual embed demo) | ✅ |
| Remote policy stub | ✅ |
| npm publish | Roadmap |
| Hosted semantic policy (production) | Roadmap |
| Wallet Standard / MWA adapters | Roadmap |

**Conclusion:** SDK roadmap for **pre–wallet-pilot technical review is covered**. Next step is outreach + optional npm publish when a team opts in — not more core SDK features before first conversation.

## Not in submission scope

- npm publish (until pilot confirmed)
- Production hosted policy backend
- RPC Guard
- Consumer wallet product

## Related

- [WALLET_SDK_INTEGRATION.md](./WALLET_SDK_INTEGRATION.md)
- [WALLET_PILOT.md](./WALLET_PILOT.md)
- [WALLET_LAB.md](./WALLET_LAB.md)
- [THREAT_MODEL.md](./THREAT_MODEL.md)
