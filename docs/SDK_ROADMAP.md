# Phase 3 — Wallet SDK (post-submit hackathon addition)

**Date:** 2026-05-19  
**Status:** Active development — **not submission scope**

> **Judges:** evaluate **`src/extension/`** only. Everything below was added **after** the Colosseum submission, for optional curiosity. Whether to look is entirely at your discretion — it is not offered as part of the scored deliverable.

## Why this exists

PaladinShield is a **Runtime Enforcement Layer (REL)**, not a browser-extension product in the long run. The MV3 extension is the Phase 1 proof that Promise gating works in the wild. Phase 3 documents the same enforcement primitives **embeddable in wallet signing surfaces** — the path toward infrastructure-grade REL on Solana.

## What this is

| Layer | Role |
|-------|------|
| `src/extension/` | **Submitted & shipped demo** — Promise gate, popup, OpenAI semantic path, Evidence Hub |
| `packages/rel-core/` | **Post-submit SDK scaffold** — same local heuristics + gate primitives, no MV3 UI |

Local heuristics live in **`src/extension/scripts/policy-heuristics.js`** (canonical). `@paladinshield/rel-core` re-exports that module so extension and SDK cannot drift.

## Post-submit additions

| Date | Item | Notes |
|------|------|--------|
| 2026-05-19 | Unified `policy-heuristics.js` | Extension + SDK share one policy fast path |
| 2026-05-19 | `examples/wallet-shell.mjs` | Mock wallet + `createRelGate`: hostile hard-block, benign approve, medium-risk operator flow |
| 2026-05-19 | **`@paladinshield/rel-core` v0.2.0** | Gate tests, `signAndSendTransaction` wrap, TypeScript `.d.ts` |
| 2026-05-19 | **`docs/WALLET_PILOT.md`** | Generic wallet pilot brief (no partner names on-repo) |
| 2026-05-19 | **`docs/THREAT_MODEL.md`** | REL coverage and explicit limits |
| 2026-05-19 | **`examples/browser-demo.html`** | In-browser A/B/C demo (requires static server) |

Optional — only if you already reviewed the extension and want to see wallet-native direction:

```bash
npm test
node packages/rel-core/examples/wallet-shell.mjs
npx --yes serve packages/rel-core/examples -p 3456
# → http://localhost:3456/browser-demo.html
```

**Judge demo (unchanged):** `wallet-shell.mjs` remains the primary curiosity path — v0.2.0 adds tests and wallet-team ergonomics around it, not a replacement.

## Not in submission scope

- npm publish
- Phantom / Solflare integration spikes
- RPC Guard
- Full forensic certificate parity
- Remote policy client package

## Roadmap milestone

**v0.2.0** shipped (gate tests, `signAndSendTransaction`, `.d.ts`). **v0.2.x docs:** `WALLET_PILOT.md`, `THREAT_MODEL.md`, browser demo. Next: wallet pilot spike when a team opts in — still Phase 3, not a replacement for the extension demo.

See also: [WALLET_SDK_INTEGRATION.md](./WALLET_SDK_INTEGRATION.md)
