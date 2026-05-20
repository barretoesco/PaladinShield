# Wallet integration pilot — PaladinShield REL (general)

**Status:** Exploratory · **not** production-ready · **not** hackathon submission scope  
**Audience:** Solana wallet teams evaluating embeddable Runtime Enforcement Layer (REL)  
**Last updated:** 2026-05-19

> Public, generic brief for technical conversations. Partner-specific terms, timelines, and contacts stay off-repo.

---

## What PaladinShield REL is

A **pre-sign enforcement layer**: intercept wallet signing methods, evaluate policy, hard-block critical risk or require explicit operator approval **before** bytes reach the native signer.

The **MV3 extension** (`src/extension/`) proves REL in a browser injection context. **`@paladinshield/rel-core`** (`packages/rel-core/`) exposes the same gate semantics for wallet-native embedding.

PaladinShield is infrastructure (REL), not a consumer browser-extension product long term.

---

## Integration surface (today)

| API | Role |
|-----|------|
| `wrapSolanaProvider(provider, options)` | Drop-in wrap: `signTransaction`, `signAllTransactions`, `signMessage`, `signAndSendTransaction` |
| `createRelGate(options)` | Lower-level Promise gate if you control the wallet shell |
| `evaluateIntent(intent)` | Local heuristics first; optional remote `policyEngine` hook |
| `isCriticalVerdict(verdict)` | `true` for `Alto` / `Bloquear` |

Policy contract matches the extension: `{ riesgo, accion, mensaje }`.

Local heuristics are canonical in `src/extension/scripts/policy-heuristics.js` (shared with SDK).

---

## Pilot scope (honest)

**In scope for an early pilot:**

- Technical review of API + policy contract
- Node demo: mock provider + REL gate (`wallet-shell.mjs`)
- Architecture discussion: where REL sits in your signing stack
- Optional spike: wrap your dev/staging provider behind `createRelGate`

**Out of scope until later phases:**

- Production rollout / app-store submission
- SLA, hosted policy backend, or OEM commercial terms (separate conversation)
- Full parity with extension UI (popup, decision tokens, Evidence Hub UI)
- Phantom-class distribution or RPC Guard

---

## What the wallet team typically provides

- Staging build or internal hook point on signing methods
- One technical owner for a 30–60 minute architecture call
- Feedback on operator UX (when to hard-block vs prompt)
- Optional: anonymized sample intents for false-positive tuning

---

## What PaladinShield provides in a pilot

- `@paladinshield/rel-core` v0.4.x reference package (monorepo path install)
- Runnable demos and tests (see below)
- Policy alignment with the public extension demo
- GPL-3.0 engine + optional commercial OEM path for proprietary wallets (see root `README.md` licensing section)

---

## Try it locally (no wallet build required)

From repository root (Node 18+):

```bash
npm test
node packages/rel-core/examples/wallet-shell.mjs
node packages/rel-core/examples/wallet-with-tokens.mjs
npm run demo:policy-hook
npm run demo:browser
```

Expected: hostile hard-block without UI, benign approve flow, medium-risk operator decision — all in console.

Optional browser demo (static server required):

```bash
npm run demo:wallet-lab
```

Open `http://localhost:3456/` for demo index, or directly:
`/packages/rel-core/examples/wallet-lab.html`

See [WALLET_LAB.md](./WALLET_LAB.md) — signing surface simulator for integration demos (not a wallet product).

---

## Suggested pilot phases

| Phase | Goal | Duration (indicative) |
|-------|------|------------------------|
| **0 — Review** | Run demos, read `docs/THREAT_MODEL.md`, align on signing hook points | 1 session |
| **1 — Spike** | Wrap staging provider; log verdicts only (shadow mode) | days |
| **2 — Enforce** | Hard-block critical; operator prompt on `Advertir` | days–weeks |
| **3 — Harden** | Decision-token pattern, forensic export, remote policy proxy | roadmap |

Phases are flexible; no commitment implied by this document.

---

## Success criteria (pilot)

- Critical hostile patterns hard-block without reaching native signer
- Benign faucet/devnet flows do not false-block at scale you accept for pilot
- Operator can approve or deny non-critical intents deliberately
- Team can articulate where REL sits vs existing wallet security features

---

## Related docs

- [SDK_ROADMAP.md](./SDK_ROADMAP.md) — post-submit SDK direction  
- [WALLET_SDK_INTEGRATION.md](./WALLET_SDK_INTEGRATION.md) — API sketch  
- [THREAT_MODEL.md](./THREAT_MODEL.md) — coverage and limits  

---

*For pilot inquiries, contact the repository maintainer through channels agreed outside this public document.*
